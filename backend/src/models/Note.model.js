import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Note schema.
 * Represents an uploaded study document (PDF, etc.) belonging to a user.
 * The extracted text is stored but hidden from default queries to keep
 * list responses lean.
 */
const noteSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    storedFilename: {
      type: String,
      required: [true, 'Stored filename is required'],
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    fileSizeKb: {
      type: Number,
      required: [true, 'File size is required'],
      max: [10240, 'File size cannot exceed 10 MB (10240 KB)'],
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    excerpt: {
      type: String,
      default: '',
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['processing', 'ready', 'error'],
        message: 'Status must be one of: processing, ready, error',
      },
      default: 'processing',
    },
    extractedText: {
      type: String,
      select: false,
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
 * Compound index for efficient per-user listing sorted by newest first.
 * Covers the most common query pattern: "give me this user's notes, newest first".
 */
noteSchema.index({ ownerId: 1, createdAt: -1 });

/* ------------------------------------------------------------------ */
/*  JSON serialisation                                                */
/* ------------------------------------------------------------------ */
noteSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Note = mongoose.model('Note', noteSchema);

export default Note;
