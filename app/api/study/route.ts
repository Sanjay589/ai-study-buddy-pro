/**
 * Study API Route - Central request handler
 *
 * This is the single entry function that handles all study tasks:
 * - Retrieves relevant context using RAG (if documents are indexed)
 * - Constructs system prompt dynamically based on task type and difficulty
 * - Requests structured JSON output from LLM (for quiz/flashcards)
 * - Returns formatted result
 *
 * Supports: explain, summarize, quiz, flashcards
 */

import { generateText, streamText, Output } from "ai";
import { z } from "zod";
import { retrieveContext, hasDocuments } from "@/lib/rag";
import {
  buildSystemPrompt,
  type TaskType,
  type Difficulty,
} from "@/lib/prompts";

// ── Zod schemas for structured outputs ─────────────────────────────────────

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
    })
  ),
});

const flashcardSchema = z.object({
  flashcards: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),
});

// ── Main handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskType, userInput, difficulty, sessionId } = body;
    console.log("[v0] API /api/study hit:", { taskType, difficulty, sessionId, inputLen: userInput?.length });

    // Validate input
    if (!userInput || typeof userInput !== "string" || userInput.trim().length === 0) {
      return Response.json(
        { error: "Please enter some text or a topic to study." },
        { status: 400 }
      );
    }

    if (!taskType || !["explain", "summarize", "quiz", "flashcards"].includes(taskType)) {
      return Response.json(
        { error: "Invalid task type." },
        { status: 400 }
      );
    }

    const validDifficulty: Difficulty = ["beginner", "intermediate", "advanced"].includes(difficulty)
      ? difficulty
      : "intermediate";

    // ── Step 1: Retrieve relevant context using RAG ──────────────────────
    let ragContext: string[] = [];
    if (sessionId && hasDocuments(sessionId)) {
      ragContext = await retrieveContext(sessionId, userInput, 3);
    }

    // ── Step 2: Build system prompt dynamically ──────────────────────────
    const systemPrompt = buildSystemPrompt(
      taskType as TaskType,
      validDifficulty,
      ragContext
    );

    // ── Step 3: Handle based on task type ────────────────────────────────

    if (taskType === "quiz") {
      // Use structured output for quiz generation with JSON validation
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        system: systemPrompt,
        prompt: userInput.trim(),
        output: Output.object({ schema: quizSchema }),
        temperature: 0.7,
      });

      if (!output) {
        return Response.json(
          { error: "Failed to generate quiz. Please try again." },
          { status: 500 }
        );
      }

      return Response.json({
        type: "quiz",
        data: output,
        ragUsed: ragContext.length > 0,
      });
    }

    if (taskType === "flashcards") {
      // Use structured output for flashcard generation with JSON validation
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        system: systemPrompt,
        prompt: userInput.trim(),
        output: Output.object({ schema: flashcardSchema }),
        temperature: 0.7,
      });

      if (!output) {
        return Response.json(
          { error: "Failed to generate flashcards. Please try again." },
          { status: 500 }
        );
      }

      return Response.json({
        type: "flashcards",
        data: output,
        ragUsed: ragContext.length > 0,
      });
    }

    // For explain/summarize, stream text for better UX
    const result = streamText({
      model: "openai/gpt-4o-mini",
      system: systemPrompt,
      prompt: userInput.trim(),
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    // Return a plain text stream (not SSE) for manual consumption on client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Study API error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    // Check for specific API errors
    if (message.includes("API key") || message.includes("authentication")) {
      return Response.json(
        { error: "API configuration error. Please check your settings." },
        { status: 401 }
      );
    }

    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return Response.json(
        { error: "Request timed out. Please try again." },
        { status: 504 }
      );
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
