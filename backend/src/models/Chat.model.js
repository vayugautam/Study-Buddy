import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Chat schema.
 * Represents a conversation session between a user and the AI assistant.
 *
 * Design decision — Reference Pattern:
 *   Messages are stored in a SEPARATE `Message` collection (not embedded)
 *   to avoid the 16 MB document limit and to allow efficient pagination
 *   of long conversation histories.
 */
const chatSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    noteIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Note' }],
      default: [],
    },
    title: {
      type: String,
      required: [true, 'Chat title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
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
 * Compound index for listing a user's chats sorted by most-recently-active.
 */
chatSchema.index({ ownerId: 1, lastActivityAt: -1 });

/* ------------------------------------------------------------------ */
/*  JSON serialisation                                                */
/* ------------------------------------------------------------------ */
chatSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
