/**
 * @module services/embeddings
 * @description Text chunking, embedding generation, local JSON storage, and
 * similarity search. Replaces ChromaDB with a pure Node.js fallback
 * so Docker is not required for local development.
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import fs from 'fs/promises';
import path from 'path';
import geminiService from './gemini.service.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

const VECTOR_STORE_PATH = path.resolve(process.cwd(), 'data', 'vectors.json');

// Ensure data directory exists
async function ensureVectorStore() {
  try {
    await fs.mkdir(path.dirname(VECTOR_STORE_PATH), { recursive: true });
    try {
      await fs.access(VECTOR_STORE_PATH);
    } catch {
      await fs.writeFile(VECTOR_STORE_PATH, JSON.stringify([]));
    }
  } catch (error) {
    logger.error('Failed to initialize vector store', { error: error.message });
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const embeddingsService = {
  /**
   * Split a long text into overlapping chunks suitable for embedding.
   */
  async chunkText(text, { chunkSize = 1000, chunkOverlap = 200 } = {}) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    const chunks = await splitter.splitText(text);
    return chunks;
  },

  /**
   * Generate embeddings for each chunk and save them to the local JSON file.
   */
  async embedAndStore({ noteId, ownerId, chunks, originalFilename }) {
    try {
      await ensureVectorStore();
      const embeddings = await geminiService.generateEmbeddings(chunks);

      const newVectors = chunks.map((chunk, i) => ({
        id: `${noteId.toString()}_chunk_${i}`,
        text: chunk,
        embedding: embeddings[i],
        metadata: {
          noteId: noteId.toString(),
          ownerId: ownerId.toString(),
          chunkIndex: i,
          sourceFilename: originalFilename,
        }
      }));

      // Read existing, append, and save
      const fileContent = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
      const allVectors = JSON.parse(fileContent || '[]');
      
      // Remove any existing vectors for this note (upsert logic)
      const filteredVectors = allVectors.filter(v => v.metadata.noteId !== noteId.toString());
      filteredVectors.push(...newVectors);

      await fs.writeFile(VECTOR_STORE_PATH, JSON.stringify(filteredVectors));

      logger.info('Embeddings stored locally', {
        noteId: noteId.toString(),
        chunksStored: chunks.length,
      });

      return { chunksStored: chunks.length };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Embedding storage failed', { error: error.message });
      throw new AppError(
        'Failed to store embeddings locally.',
        500,
        'EMBEDDING_STORE_ERROR',
      );
    }
  },

  /**
   * Query the local JSON store using cosine similarity.
   */
  async queryRelevantChunks({ query, ownerId, noteIds, topK = 5 }) {
    try {
      await ensureVectorStore();
      
      // Read all vectors
      const fileContent = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
      const allVectors = JSON.parse(fileContent || '[]');

      // Generate embedding for the user's query
      const [queryEmbedding] = await geminiService.generateEmbeddings([query]);

      // Filter by ownerId and optionally noteIds
      const validVectors = allVectors.filter(v => {
        if (v.metadata.ownerId !== ownerId.toString()) return false;
        if (noteIds && noteIds.length > 0 && !noteIds.map(id => id.toString()).includes(v.metadata.noteId)) {
          return false;
        }
        return true;
      });

      // Calculate similarities
      const scoredVectors = validVectors.map(v => ({
        ...v,
        score: cosineSimilarity(queryEmbedding, v.embedding)
      }));

      // Sort by score descending and take top K
      scoredVectors.sort((a, b) => b.score - a.score);
      const topVectors = scoredVectors.slice(0, topK);

      // Format results exactly like ChromaDB
      return {
        documents: [topVectors.map(v => v.text)],
        metadatas: [topVectors.map(v => v.metadata)],
        distances: [topVectors.map(v => 1 - v.score)], // ChromaDB uses distance, where lower is better
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Vector query failed', { error: error.message });
      throw new AppError(
        `Failed to query local vectors: ${error.message}`,
        500,
        'VECTOR_QUERY_ERROR',
      );
    }
  },
};

export default embeddingsService;
