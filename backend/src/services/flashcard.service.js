/**
 * @module services/flashcard
 * @description Generates and manages flashcard decks using spaced repetition.
 */

import FlashcardDeck from '../models/FlashcardDeck.model.js';
import Note from '../models/Note.model.js';
import embeddingsService from './embeddings.service.js';
import groqService from './groq.service.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

/**
 * Basic Levenshtein distance to detect very similar flashcard fronts.
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + indicator
      );
    }
  }
  return matrix[a.length][b.length];
}

const flashcardService = {
  /**
   * Generate flashcards from a note.
   */
  async generateFlashcards({ ownerId, noteId, count = 20 }) {
    const note = await Note.findOne({ _id: noteId, ownerId });
    if (!note) {
      throw new NotFoundError('Note not found or unauthorized.');
    }

    // Retrieve generic sample
    const results = await embeddingsService.queryRelevantChunks({
      query: `Key terms, definitions, dates, and core concepts`,
      ownerId,
      noteIds: [noteId],
      topK: 10,
    });

    const context = results.documents?.[0]?.join('\n\n') || '';

    if (!context) {
      throw new ValidationError(['Note does not have enough content to generate flashcards.']);
    }

    const systemPrompt = `
Extract core terminology, dates, formulas, and key concepts from the provided context.
Generate up to ${count} flashcards.

CRITICAL RULES:
1. 'front' MUST be extremely concise (1-5 words, max 50 chars).
2. 'back' MUST be a clear, one-sentence definition (max 300 chars).
3. Provide 1 or 2 relevant tags per card.
4. Output ONLY valid JSON matching this schema:
{
  "deckTitle": "A descriptive title",
  "cards": [
    {
      "front": "Concept Name",
      "back": "Clear definition of the concept.",
      "tags": ["tag1", "tag2"]
    }
  ]
}
`;

    const generatedData = await groqService.generateStructuredData(systemPrompt, context);

    if (!generatedData || !Array.isArray(generatedData.cards)) {
      throw new Error('Invalid JSON format from Gemini.');
    }

    // Validate lengths
    const validatedCards = generatedData.cards
      .filter(c => c.front && c.back)
      .map(c => ({
        front: c.front.substring(0, 50), // Enforce length limits
        back: c.back.substring(0, 300),
        tags: c.tags || [],
        masteryStatus: 'unseen'
      }));

    // Check if deck already exists for this note
    let deck = await FlashcardDeck.findOne({ noteId, ownerId });

    if (!deck) {
      // Create new deck
      deck = await FlashcardDeck.create({
        ownerId,
        noteId,
        title: generatedData.deckTitle || `${note.title} Flashcards`,
        cards: validatedCards
      });
    } else {
      // De-duplicate against existing cards
      const existingFronts = deck.cards.map(c => c.front.toLowerCase().replace(/[^\w\s]|_/g, ""));
      const newUniqueCards = [];

      for (const newCard of validatedCards) {
        const newFrontClean = newCard.front.toLowerCase().replace(/[^\w\s]|_/g, "");
        let isDuplicate = false;
        
        for (const existingFront of existingFronts) {
          if (newFrontClean === existingFront) {
            isDuplicate = true;
            break;
          }
          // Check Levenshtein > 85% similarity roughly
          const maxLen = Math.max(newFrontClean.length, existingFront.length);
          if (maxLen > 0) {
            const dist = levenshteinDistance(newFrontClean, existingFront);
            if ((maxLen - dist) / maxLen > 0.85) {
              isDuplicate = true;
              break;
            }
          }
        }

        if (!isDuplicate) {
          newUniqueCards.push(newCard);
          existingFronts.push(newFrontClean); // Prevent duplicates within the generated batch
        }
      }

      if (newUniqueCards.length > 0) {
        deck.cards.push(...newUniqueCards);
        await deck.save();
      }
    }

    logger.info('Generated flashcards', { deckId: deck._id, addedCards: validatedCards.length });
    return deck;
  },

  /**
   * Create a custom deck explicitly.
   */
  async createCustomDeck(ownerId, { noteId, title, cards }) {
    const deck = await FlashcardDeck.create({
      ownerId,
      noteId,
      title: title || 'Custom Deck',
      cards: cards.map(c => ({
        front: c.front.substring(0, 50),
        back: c.back.substring(0, 300),
        tags: c.tags || [],
        masteryStatus: 'unseen'
      }))
    });
    return deck;
  },

  /**
   * Get all decks for a user.
   */
  async getUserFlashcards(ownerId) {
    return await FlashcardDeck.find({ ownerId });
  },

  /**
   * Get a specific deck.
   */
  async getDeckById(deckId, ownerId) {
    const deck = await FlashcardDeck.findOne({ _id: deckId, ownerId });
    if (!deck) {
      throw new NotFoundError('Flashcard deck not found or unauthorized.');
    }
    return deck;
  },

  /**
   * Get a study session feed of max 20 cards using Spaced Repetition logic.
   */
  async getStudySession(deckId, ownerId) {
    const pipeline = [
      { $match: { _id: deckId, ownerId } },
      { $unwind: "$cards" },
      {
        $sort: {
          "cards.masteryStatus": 1, // unseen (u) -> review (r) -> mastered (m)
          "cards.lastReviewedAt": 1 // older first
        }
      },
      { $limit: 20 },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          noteId: { $first: "$noteId" },
          cards: { $push: "$cards" }
        }
      }
    ];

    // Note: since FlashcardDeck._id is an ObjectId, we might need to cast deckId.
    // Assuming Mongoose auto-casts in aggregations if defined, but using findById instead is safer.
    // Let's do it in JS for simplicity and guaranteed safety if the array is small.
    // If we wanted to use aggregate, we'd need mongoose.Types.ObjectId(deckId).

    const deck = await FlashcardDeck.findOne({ _id: deckId, ownerId });
    if (!deck) {
      throw new NotFoundError('Flashcard deck not found or unauthorized.');
    }

    // JS-based sorting for simplicity and safe ID matching
    const sortedCards = deck.cards.sort((a, b) => {
      const order = { 'unseen': 0, 'review': 1, 'mastered': 2 };
      const statusDiff = order[a.masteryStatus] - order[b.masteryStatus];
      if (statusDiff !== 0) return statusDiff;
      
      const timeA = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
      const timeB = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
      return timeA - timeB; // Ascending (older first)
    });

    return {
      ...deck.toJSON(),
      cards: sortedCards.slice(0, 20)
    };
  },

  /**
   * Update the mastery status of a specific card.
   */
  async updateCardMastery(deckId, cardId, ownerId, masteryStatus) {
    const deck = await FlashcardDeck.findOneAndUpdate(
      { _id: deckId, ownerId, "cards._id": cardId },
      { 
        $set: { 
          "cards.$.masteryStatus": masteryStatus,
          "cards.$.lastReviewedAt": new Date(),
          lastStudiedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!deck) {
      throw new NotFoundError('Deck or card not found.');
    }

    return deck.cards.id(cardId);
  },

  /**
   * Delete a deck.
   */
  async deleteDeck(deckId, ownerId) {
    const result = await FlashcardDeck.deleteOne({ _id: deckId, ownerId });
    if (result.deletedCount === 0) {
      throw new NotFoundError('Flashcard deck not found or unauthorized.');
    }
  }
};

export default flashcardService;
