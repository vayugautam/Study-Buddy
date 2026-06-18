/**
 * @module services/rag
 * @description Retrieval-Augmented Generation orchestrator. Ties together
 * vector search (embeddings service) and LLM generation (Gemini service)
 * to produce grounded, citation-backed answers from the user's notes.
 */

import embeddingsService from './embeddings.service.js';
import groqService from './groq.service.js';
import logger from '../utils/logger.js';

/** Maximum cosine distance (lower = more similar) for a chunk to be considered relevant. */
const RELEVANCE_THRESHOLD = 0.99;

/**
 * Build a formatted context string from retrieved chunks and their metadata.
 * @param {string[][]} documents - 2D array of document texts from ChromaDB.
 * @param {object[][]} metadatas - Matching metadata arrays.
 * @param {number[][]} distances - Cosine distances for each result.
 * @returns {string} Context block ready for inclusion in a prompt.
 */
const buildContext = (documents, metadatas, distances) => {
  if (
    !documents ||
    !documents[0] ||
    documents[0].length === 0
  ) {
    return '';
  }

  const chunks = [];

  for (let i = 0; i < documents[0].length; i++) {
    const distance = distances[0][i];
    if (distance > RELEVANCE_THRESHOLD) continue;

    const meta = metadatas[0][i];
    const chunkIndex = meta.chunkIndex ?? i;
    const source = meta.sourceFilename ?? 'Unknown source';
    const text = documents[0][i];

    chunks.push(`[Source: ${source}, Chunk ${chunkIndex}]: ${text}`);
  }

  return chunks.join('\n\n');
};

/**
 * Extract citation references (e.g. [Page 3], [Source: file.pdf]) from
 * the model's response text.
 * @param {string} text
 * @returns {string[]} Unique citation strings found in the response.
 */
const extractCitations = (text) => {
  const citationRegex = /\[(?:Page|Source|Chunk)[^\]]*\]/gi;
  const matches = text.match(citationRegex);
  if (!matches) return [];

  // De-duplicate while preserving order.
  return [...new Set(matches)];
};

const ragService = {
  /**
   * Generate a grounded answer to a user query using RAG.
   * @param {{ query: string, ownerId: string, noteIds?: string[], chatHistory?: Array<{ role: string, content: string }> }} params
   * @returns {Promise<{ answer: string, citations: string[] }>}
   */
  async generateAnswer({ query, ownerId, noteIds, chatHistory = [] }) {
    // 1. Retrieve relevant chunks from the vector store.
    const results = await embeddingsService.queryRelevantChunks({
      query,
      ownerId,
      noteIds,
      topK: 5,
    });

    const context = buildContext(
      results.documents,
      results.metadatas,
      results.distances,
    );

    // 2. Build the grounding system prompt.
    const systemPrompt = [
      'You are the AI Study Buddy, a helpful academic assistant.',
      'Answer the user\'s question ONLY using the CONTEXT provided below.',
      'If the answer cannot be found in the CONTEXT, say: "I cannot find that information in your notes."',
      'Always cite your sources using [Source: filename, Chunk N] when referencing specific information.',
      'Keep answers concise, accurate, and well-structured.',
      '',
      '--- CONTEXT START ---',
      context || '(No relevant context was found in the user\'s notes.)',
      '--- CONTEXT END ---',
    ].join('\n');

    // 3. Format chat history for the Gemini chat API.
    const formattedHistory = chatHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 4. Generate the response.
    const responseText = await groqService.generateChatResponse(
      systemPrompt,
      formattedHistory,
      query,
    );

    // 5. Extract citations.
    const citations = extractCitations(responseText);

    logger.info('RAG answer generated', {
      ownerId,
      citationsCount: citations.length,
      contextChunks: context ? context.split('\n\n').length : 0,
    });

    return {
      answer: responseText,
      citations,
    };
  },
};

export default ragService;
