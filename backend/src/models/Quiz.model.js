import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Question sub-schema.
 * Represents a single multiple-choice question inside a quiz.
 * Validates that exactly 4 answer options are provided.
 */
const questionSchema = new Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
    },
    options: {
      type: [String],
      validate: {
        validator(val) {
          return val.length === 4;
        },
        message: 'Each question must have exactly 4 options',
      },
    },
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
    },
    explanation: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

/**
 * Attempt sub-schema.
 * Records the result of a single quiz attempt.
 */
const attemptSchema = new Schema(
  {
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Quiz schema.
 * Represents an AI-generated quiz derived from a user's note.
 * Questions are embedded for atomic reads; attempts are appended
 * over time as the user retakes the quiz.
 */
const quizSchema = new Schema(
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
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    difficulty: {
      type: String,
      required: true,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: 'Difficulty must be one of: easy, medium, hard',
      },
      default: 'medium',
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    attempts: {
      type: [attemptSchema],
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
 * Lookup quizzes for a specific note belonging to a specific user.
 */
quizSchema.index({ ownerId: 1, noteId: 1 });

/**
 * List all quizzes for a user sorted by newest first.
 */
quizSchema.index({ ownerId: 1, createdAt: -1 });

/* ------------------------------------------------------------------ */
/*  JSON serialisation                                                */
/* ------------------------------------------------------------------ */
quizSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
