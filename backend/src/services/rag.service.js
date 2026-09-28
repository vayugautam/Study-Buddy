/**
 * @module services/rag
 * @description Retrieval-Augmented Generation orchestrator. Ties together
 * vector search (embeddings service) and LLM generation (Gemini service)
 * to produce grounded, citation-backed answers from the user's notes.
 */

import embeddingsService from './embeddings.service.js';
import groqService from './groq.service.js';
import Note from '../models/Note.model.js';
import logger from '../utils/logger.js';

/** Maximum cosine distance (lower = more similar) for a chunk to be considered relevant. */
const RELEVANCE_THRESHOLD = 0.99;

/**
 * Build a formatted context string from retrieved chunks and their metadata.
 * @param {string[][]} documents - 2D array of document texts from ChromaDB.
 * @param {object[][]} metadatas - Matching metadata arrays.
 * @param {number[][]} distances - Cosine distances for each result.
 * @returns {string} Context block ready for inclusion in a prompt.
 */
const buildContext = (documents, metadatas, distances) => {
  if (
    !documents ||
    !documents[0] ||
    documents[0].length === 0
  ) {
    return '';
  }

  const chunks = [];

  for (let i = 0; i < documents[0].length; i++) {
    const distance = distances[0][i];
    if (distance > RELEVANCE_THRESHOLD) continue;

    const meta = metadatas[0][i] || {};
    const chunkIndex = meta.chunkIndex ?? i;
    const source = meta.sourceFilename ?? 'Uploaded Document';
    const text = documents[0][i];

    if (text) {
      chunks.push(`[Source: ${source}, Chunk ${chunkIndex}]: ${text}`);
    }
  }

  return chunks.join('\n\n');
};

/**
 * Extract citation references (e.g. [Page 3], [Source: file.pdf]) from
 * the model's response text.
 * @param {string} text
 * @returns {string[]} Unique citation strings found in the response.
 */
const extractCitations = (text) => {
  const citationRegex = /\[(?:Page|Source|Chunk)[^\]]*\]/gi;
  const matches = text.match(citationRegex);
  if (!matches) return [];

  // De-duplicate while preserving order.
  return [...new Set(matches)];
};

const ragService = {
  /**
   * Generate a grounded answer to a user query using RAG.
   * @param {{ query: string, ownerId: string, noteIds?: string[], chatHistory?: Array<{ role: string, content: string }> }} params
   * @returns {Promise<{ answer: string, citations: string[] }>}
   */
  async generateAnswer({ query, ownerId, noteIds, chatHistory = [] }) {
    // 1. Fetch available notes for user to ground document awareness
    let userNotes = [];
    try {
      const noteFilter = { ownerId };
      if (noteIds && noteIds.length > 0) {
        noteFilter._id = { $in: noteIds };
      }
      userNotes = await Note.find(noteFilter).select('title originalFilename excerpt pageCount +extractedText').lean();
      if (userNotes.length === 0 && noteIds && noteIds.length > 0) {
        // Fallback to all notes if filtered noteIds yielded none
        userNotes = await Note.find({ ownerId }).select('title originalFilename excerpt pageCount +extractedText').lean();
      }
    } catch (noteErr) {
      logger.warn('Failed to load notes for RAG grounding', { error: noteErr.message });
    }

    const noteSummaries = userNotes.map((n, idx) => 
      `Document ${idx + 1}: "${n.originalFilename || n.title}" (Title: ${n.title}, Pages: ${n.pageCount || 'Unknown'})\nSummary / Overview: ${n.excerpt || 'No summary excerpt available.'}`
    ).join('\n\n');

    // 2. Retrieve relevant chunks from the vector store.
    const results = await embeddingsService.queryRelevantChunks({
      query,
      ownerId,
      noteIds,
      topK: 6,
    });

    let context = buildContext(
      results.documents,
      results.metadatas,
      results.distances,
    );

    // If context is still empty but user notes exist, use available note extractedText or excerpts as baseline context
    if (!context && userNotes.length > 0) {
      context = userNotes
        .filter(n => n.extractedText || n.excerpt)
        .map((n, i) => `[Source: ${n.originalFilename || n.title}, Chunk ${i}]: ${n.extractedText || n.excerpt}`)
        .join('\n\n');
    }

    // 3. Build the grounding system prompt.
    const systemPrompt = [
      'You are the AI Study Buddy, an intelligent and encouraging academic study companion.',
      'You are provided with the user\'s uploaded notes and extracted document context below.',
      '',
      'INSTRUCTIONS:',
      '1. If the user asks for an overview, summary, or explanation of the document (such as "explain me the doc", "what is this document about", or "summarize"), provide a well-structured, clear summary covering the core topics, key themes, and main takeaways based on the documents and context below.',
      '2. If the user asks a specific question covered in the notes or context, provide a detailed, accurate answer.',
      '3. When referencing specific details, cite the source note using [Source: filename, Chunk N].',
      '4. Only state that you cannot find information if the user asks a specific factual question that is completely absent from all documents and context.',
      '5. Use clean Markdown formatting with clear headings, bullet points, and emphasis.',
      '',
      '--- USER DOCUMENTS ---',
      noteSummaries || '(No document records found)',
      '',
      '--- DOCUMENT CONTEXT CHUNKS ---',
      context || '(No specific chunks found. Refer to document overview if available.)',
      '--- CONTEXT END ---',
    ].join('\n');

    // 4. Format chat history
    const formattedHistory = chatHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // 5. Generate the response.
    const responseText = await groqService.generateChatResponse(
      systemPrompt,
      formattedHistory,
      query,
    );

    // 5. Extract citations.
    const citations = extractCitations(responseText);

    logger.info('RAG answer generated', {
      ownerId,
      citationsCount: citations.length,
      contextChunks: context ? context.split('\n\n').length : 0,
    });

    return {
      answer: responseText,
      citations,
    };
  },
};

export default ragService;
