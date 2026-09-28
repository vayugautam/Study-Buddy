import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * DocumentChunk schema.
 * Stores text chunks and their embedding vectors in MongoDB so that
 * vector similarity search survives restarts on ephemeral hosting (e.g. Render).
 */
const documentChunkSchema = new Schema(
  {
    noteId: {
      type: Schema.Types.ObjectId,
      ref: 'Note',
      required: [true, 'Note ID is required'],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    sourceFilename: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

documentChunkSchema.index({ ownerId: 1, noteId: 1 });

const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);

export default DocumentChunk;
