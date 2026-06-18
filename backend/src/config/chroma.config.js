import { ChromaClient } from 'chromadb';
import config from './env.config.js';

/**
 * Default ChromaDB collection name used across the application.
 * @type {string}
 */
export const COLLECTION_NAME = 'study_buddy_vectors';

/**
 * Creates and returns a ChromaClient instance configured with the
 * server URL from the validated application config.
 *
 * @returns {ChromaClient} A ready-to-use ChromaDB client.
 */
export const getChromaClient = () => {
  return new ChromaClient({
    path: config.chroma.serverUrl,
  });
};
