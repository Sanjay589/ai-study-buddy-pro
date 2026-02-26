/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 *
 * This module handles:
 * 1. Text chunking - splits uploaded documents into smaller segments
 * 2. Embedding generation - creates vector embeddings via OpenAI
 * 3. Vector storage - stores embeddings in an in-memory index
 * 4. Retrieval - finds top-k relevant chunks using cosine similarity
 */

import { embed } from "ai";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface VectorStore {
  chunks: DocumentChunk[];
}

// ── Global in-memory vector store (per-server instance) ────────────────────

const vectorStores = new Map<string, VectorStore>();

/**
 * Chunk text into smaller overlapping segments.
 * Uses a sliding window approach with configurable size and overlap
 * to maintain context across chunk boundaries.
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 100
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  if (words.length <= chunkSize) {
    return [words.join(" ")];
  }

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

/**
 * Generate an embedding vector for a given text using the AI SDK.
 * Uses OpenAI's text-embedding-3-small model via Vercel AI Gateway.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: "openai/text-embedding-3-small" as never,
    value: text,
  });
  return embedding;
}

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Index document text: chunk it, generate embeddings, and store in memory.
 * Returns the session ID to retrieve context later.
 */
export async function indexDocument(
  sessionId: string,
  text: string
): Promise<{ chunksIndexed: number }> {
  const chunks = chunkText(text);

  // Generate embeddings for all chunks in parallel
  const documentChunks: DocumentChunk[] = await Promise.all(
    chunks.map(async (chunkText, index) => {
      const embedding = await generateEmbedding(chunkText);
      return {
        id: `${sessionId}-${index}`,
        text: chunkText,
        embedding,
      };
    })
  );

  // Store in the vector store for this session
  const existing = vectorStores.get(sessionId);
  if (existing) {
    existing.chunks.push(...documentChunks);
  } else {
    vectorStores.set(sessionId, { chunks: documentChunks });
  }

  return { chunksIndexed: documentChunks.length };
}

/**
 * Retrieve the top-k most relevant document chunks for a given query.
 * Uses cosine similarity between the query embedding and stored chunk embeddings.
 */
export async function retrieveContext(
  sessionId: string,
  query: string,
  topK: number = 3
): Promise<string[]> {
  const store = vectorStores.get(sessionId);
  if (!store || store.chunks.length === 0) {
    return [];
  }

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Calculate similarity scores for each chunk
  const scored = store.chunks.map((chunk) => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Sort by score descending and return top-k
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.text);
}

/**
 * Check if a session has any indexed documents.
 */
export function hasDocuments(sessionId: string): boolean {
  const store = vectorStores.get(sessionId);
  return !!store && store.chunks.length > 0;
}

/**
 * Clear all indexed documents for a session.
 */
export function clearSession(sessionId: string): void {
  vectorStores.delete(sessionId);
}
