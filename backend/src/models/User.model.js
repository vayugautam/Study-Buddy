import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

/**
 * User preferences sub-schema.
 * Controls UI theme and notification settings.
 */
const preferencesSchema = new Schema(
  {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    studyReminders: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

/**
 * User statistics sub-schema.
 * Tracks learning activity and engagement metrics.
 */
const statsSchema = new Schema(
  {
    notesCount: {
      type: Number,
      default: 0,
      min: [0, 'notesCount cannot be negative'],
    },
    quizzesTaken: {
      type: Number,
      default: 0,
      min: [0, 'quizzesTaken cannot be negative'],
    },
    avgQuizScore: {
      type: Number,
      default: 0,
      min: [0, 'avgQuizScore cannot be negative'],
      max: [100, 'avgQuizScore cannot exceed 100'],
    },
    studyStreakDays: {
      type: Number,
      default: 0,
      min: [0, 'studyStreakDays cannot be negative'],
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Main User schema.
 * Represents a registered user of the AI Study Buddy platform.
 */
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      default: null,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                           */
/* ------------------------------------------------------------------ */
// The `unique: true` on the email field already creates a unique index.

/* ------------------------------------------------------------------ */
/*  Hooks                                                             */
/* ------------------------------------------------------------------ */

/**
 * Pre-save hook — hashes the password whenever it is new or modified.
 * Uses bcrypt with 12 salt rounds.
 */
userSchema.pre('save', async function preSaveHashPassword(next) {
  if (!this.isModified('passwordHash')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  Instance methods                                                  */
/* ------------------------------------------------------------------ */

/**
 * Compare a candidate plain-text password against the stored hash.
 * @param {string} candidatePassword - The plain-text password to verify.
 * @returns {Promise<boolean>} Resolves to true if the password matches.
 */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/* ------------------------------------------------------------------ */
/*  JSON serialisation – strip sensitive / internal fields             */
/* ------------------------------------------------------------------ */
userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
