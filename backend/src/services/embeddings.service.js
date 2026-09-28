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
import DocumentChunk from '../models/DocumentChunk.model.js';
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
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
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
    if (!text || text.trim().length === 0) return [];
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    const chunks = await splitter.splitText(text);
    return chunks;
  },

  /**
   * Generate embeddings for each chunk and save them to both MongoDB and local JSON store.
   */
  async embedAndStore({ noteId, ownerId, chunks, originalFilename }) {
    if (!chunks || chunks.length === 0) {
      return { chunksStored: 0 };
    }

    try {
      const embeddings = await geminiService.generateEmbeddings(chunks);

      const chunkDocs = chunks.map((chunk, i) => ({
        noteId,
        ownerId,
        chunkIndex: i,
        text: chunk,
        embedding: embeddings[i],
        sourceFilename: originalFilename || '',
      }));

      // 1. Persist to MongoDB (survives Render restarts)
      try {
        await DocumentChunk.deleteMany({ noteId });
        await DocumentChunk.insertMany(chunkDocs);
        logger.info('Embeddings stored in MongoDB', {
          noteId: noteId.toString(),
          chunksStored: chunks.length,
        });
      } catch (dbErr) {
        logger.error('Failed to persist embeddings to MongoDB', { error: dbErr.message });
      }

      // 2. Also update local JSON file as backup/cache
      try {
        await ensureVectorStore();
        const newVectors = chunks.map((chunk, i) => ({
          id: `${noteId.toString()}_chunk_${i}`,
          text: chunk,
          embedding: embeddings[i],
          metadata: {
            noteId: noteId.toString(),
            ownerId: ownerId.toString(),
            chunkIndex: i,
            sourceFilename: originalFilename,
          },
        }));

        const fileContent = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
        const allVectors = JSON.parse(fileContent || '[]');
        const filteredVectors = allVectors.filter((v) => v.metadata?.noteId !== noteId.toString());
        filteredVectors.push(...newVectors);
        await fs.writeFile(VECTOR_STORE_PATH, JSON.stringify(filteredVectors));
      } catch (fileErr) {
        logger.warn('Failed to save to local vectors.json backup', { error: fileErr.message });
      }

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
   * Query vectors using cosine similarity, prioritizing MongoDB chunks with fallback to local JSON.
   */
  async queryRelevantChunks({ query, ownerId, noteIds, topK = 5 }) {
    try {
      // Generate embedding for the user's query
      const [queryEmbedding] = await geminiService.generateEmbeddings([query]);
      if (!queryEmbedding) {
        return { documents: [[]], metadatas: [[]], distances: [[]] };
      }

      let candidateChunks = [];

      // 1. Try querying from MongoDB DocumentChunk first
      try {
        const queryFilter = { ownerId };
        if (noteIds && noteIds.length > 0) {
          queryFilter.noteId = { $in: noteIds };
        }
        candidateChunks = await DocumentChunk.find(queryFilter).lean();
      } catch (dbErr) {
        logger.warn('MongoDB chunk query failed, falling back to local vectors', { error: dbErr.message });
      }

      // 2. If MongoDB returned candidates, score them
      if (candidateChunks && candidateChunks.length > 0) {
        const scored = candidateChunks.map((c) => ({
          id: `${c.noteId}_chunk_${c.chunkIndex}`,
          text: c.text,
          metadata: {
            noteId: c.noteId.toString(),
            ownerId: c.ownerId.toString(),
            chunkIndex: c.chunkIndex,
            sourceFilename: c.sourceFilename,
          },
          score: cosineSimilarity(queryEmbedding, c.embedding),
        }));

        scored.sort((a, b) => b.score - a.score);

        const isOverviewQuery = /explain|summary|summarize|what is (this|the) (doc|document|note)|about|overview|tell me/i.test(query);
        let selected = [];

        if (isOverviewQuery) {
          const introChunks = scored.filter((v) => v.metadata?.chunkIndex === 0 || v.metadata?.chunkIndex === 1);
          selected = [...introChunks.slice(0, 3)];
          for (const item of scored) {
            if (selected.length >= topK) break;
            if (!selected.some((s) => s.id === item.id)) {
              selected.push(item);
            }
          }
        } else {
          selected = scored.slice(0, topK);
        }

        return {
          documents: [selected.map((v) => v.text)],
          metadatas: [selected.map((v) => v.metadata)],
          distances: [selected.map((v) => Math.max(0, 1 - (v.score || 0)))],
        };
      }

      // 3. Fallback: check local vectors.json if MongoDB has no chunks for this query
      await ensureVectorStore();
      const fileContent = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
      const allVectors = JSON.parse(fileContent || '[]');

      let validVectors = allVectors.filter((v) => {
        if (v.metadata?.ownerId && v.metadata.ownerId !== ownerId.toString()) return false;
        if (noteIds && noteIds.length > 0 && !noteIds.map((id) => id.toString()).includes(v.metadata?.noteId)) {
          return false;
        }
        return true;
      });

      if (validVectors.length === 0) {
        validVectors = allVectors.filter((v) => !v.metadata?.ownerId || v.metadata.ownerId === ownerId.toString());
      }

      if (validVectors.length === 0) {
        return { documents: [[]], metadatas: [[]], distances: [[]] };
      }

      const scoredVectors = validVectors.map((v) => ({
        ...v,
        score: cosineSimilarity(queryEmbedding, v.embedding),
      }));

      scoredVectors.sort((a, b) => b.score - a.score);

      const isOverviewQuery = /explain|summary|summarize|what is (this|the) (doc|document|note)|about|overview|tell me/i.test(query);
      let selected = [];

      if (isOverviewQuery) {
        const introChunks = validVectors.filter((v) => v.metadata?.chunkIndex === 0 || v.metadata?.chunkIndex === 1);
        selected = [...introChunks.slice(0, 3)];
        for (const item of scoredVectors) {
          if (selected.length >= topK) break;
          if (!selected.some((s) => s.id === item.id)) {
            selected.push(item);
          }
        }
      } else {
        selected = scoredVectors.slice(0, topK);
      }

      return {
        documents: [selected.map((v) => v.text)],
        metadatas: [selected.map((v) => v.metadata)],
        distances: [selected.map((v) => Math.max(0, 1 - (v.score || 0)))],
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
