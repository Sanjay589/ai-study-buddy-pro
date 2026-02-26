/**
 * Upload API Route
 *
 * Handles file upload (.txt), chunks the text,
 * generates embeddings, and stores them in the RAG vector index.
 */

import { indexDocument, clearSession } from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const { text, sessionId, clearExisting } = await req.json();

    // Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return Response.json(
        { error: "No text content provided" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Optionally clear existing documents for this session
    if (clearExisting) {
      clearSession(sessionId);
    }

    // Index the document: chunk → embed → store
    const result = await indexDocument(sessionId, text.trim());

    return Response.json({
      success: true,
      chunksIndexed: result.chunksIndexed,
      message: `Successfully indexed ${result.chunksIndexed} chunks from your document.`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process upload",
      },
      { status: 500 }
    );
  }
}
