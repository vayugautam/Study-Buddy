import mongoose from 'mongoose';
import config from './env.config.js';

/**
 * Connects to MongoDB using the URI from the validated config.
 * Logs the connected host on success or exits the process on failure.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.db.uri);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
