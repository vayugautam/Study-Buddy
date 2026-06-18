import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Card sub-schema.
 * Represents a single flashcard with front/back content and
 * spaced-repetition metadata.
 */
const cardSchema = new Schema(
  {
    front: {
      type: String,
      required: [true, 'Card front text is required'],
      maxlength: [200, 'Card front cannot exceed 200 characters'],
    },
    back: {
      type: String,
      required: [true, 'Card back text is required'],
      maxlength: [1000, 'Card back cannot exceed 1000 characters'],
    },
    tags: {
      type: [String],
      default: [],
    },
    masteryStatus: {
      type: String,
      enum: {
        values: ['unseen', 'review', 'mastered'],
        message: 'Mastery status must be one of: unseen, review, mastered',
      },
      default: 'unseen',
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

/**
 * FlashcardDeck schema.
 * Represents a collection of flashcards generated from a user's note.
 * Cards are embedded for atomic reads and writes — a typical deck is
 * well within the 16 MB document limit.
 */
const flashcardDeckSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    noteId: {
      type: Schema.Types.ObjectId,
      ref: 'Note',
      required: [true, 'Note ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Deck title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    cards: {
      type: [cardSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                           */
/* ------------------------------------------------------------------ */

/**
 * Compound index for looking up flashcard decks by owner and source note.
 */
flashcardDeckSchema.index({ ownerId: 1, noteId: 1 });

/* ------------------------------------------------------------------ */
/*  JSON serialisation                                                */
/* ------------------------------------------------------------------ */
flashcardDeckSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const FlashcardDeck = mongoose.model('FlashcardDeck', flashcardDeckSchema);

export default FlashcardDeck;
