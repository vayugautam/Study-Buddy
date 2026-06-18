import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Citation sub-schema.
 * Links a portion of an assistant response back to a specific chunk
 * in the source material (note).
 */
const citationSchema = new Schema(
  {
    sourceFilename: {
      type: String,
    },
    pageNumber: {
      type: Number,
    },
    chunkIndex: {
      type: Number,
    },
  },
  { _id: false }
);

/**
 * Message schema.
 * Stores individual messages in a chat conversation.
 *
 * Lives in its own collection (Reference Pattern) so conversations can
 * grow without hitting the 16 MB BSON document limit. Each message
 * carries an ownerId for tenant-isolation queries.
 */
const messageSchema = new Schema(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: [true, 'Chat ID is required'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    role: {
      type: String,
      required: [true, 'Message role is required'],
      enum: {
        values: ['user', 'assistant'],
        message: 'Role must be either user or assistant',
      },
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      minlength: [1, 'Message content cannot be empty'],
    },
    citations: {
      type: [citationSchema],
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  // Note: we use an explicit `timestamp` field rather than Mongoose's
  // `timestamps` option because the spec calls for a single `timestamp`
  // field (not createdAt / updatedAt).
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                           */
/* ------------------------------------------------------------------ */

/**
 * Compound index for retrieving all messages in a chat in chronological order.
 * This is the primary access pattern for loading a conversation.
 */
messageSchema.index({ chatId: 1, timestamp: 1 });

/* ------------------------------------------------------------------ */
/*  JSON serialisation                                                */
/* ------------------------------------------------------------------ */
messageSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
