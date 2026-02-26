/**
 * Prompt Templates for AI Study Buddy Pro
 *
 * Dynamically constructs system prompts based on:
 * - Task type (explain, summarize, quiz, flashcards)
 * - Difficulty level (beginner, intermediate, advanced)
 * - Retrieved RAG context (if documents are uploaded)
 */

export type TaskType = "explain" | "summarize" | "quiz" | "flashcards";
export type Difficulty = "beginner" | "intermediate" | "advanced";

/**
 * Build the system prompt based on task type, difficulty, and optional RAG context.
 * This prompt engineering approach ensures consistent, high-quality structured outputs.
 */
export function buildSystemPrompt(
  taskType: TaskType,
  difficulty: Difficulty,
  ragContext: string[] = []
): string {
  const difficultyGuide = {
    beginner:
      "Use simple language, short sentences, and everyday analogies. Assume no prior knowledge of the subject.",
    intermediate:
      "Use moderate technical language. Assume familiarity with basic concepts. Include some deeper explanations.",
    advanced:
      "Use precise technical terminology. Assume strong foundational knowledge. Include nuanced details and edge cases.",
  };

  const contextBlock =
    ragContext.length > 0
      ? `\n\nRELEVANT CONTEXT FROM UPLOADED NOTES:\n---\n${ragContext.join("\n\n")}\n---\nUse the above context to ground your response. If the context is relevant, prioritize information from it.`
      : "";

  const basePrompts: Record<TaskType, string> = {
    explain: `You are an expert tutor. Your task is to EXPLAIN the given topic or concept clearly and thoroughly.

Difficulty Level: ${difficulty}
${difficultyGuide[difficulty]}

Guidelines:
- Break down complex ideas into digestible parts
- Use relevant examples and analogies
- Structure your explanation logically with clear sections
- If applicable, mention common misconceptions
- Format your response with markdown headings, bold text, and bullet points for readability${contextBlock}`,

    summarize: `You are an expert academic summarizer. Your task is to SUMMARIZE the given text or topic concisely.

Difficulty Level: ${difficulty}
${difficultyGuide[difficulty]}

Guidelines:
- Extract the key points and main ideas
- Organize the summary with clear structure
- Keep the summary concise but comprehensive
- Highlight the most important takeaways
- Use bullet points and headings for clarity
- End with a brief "Key Takeaways" section${contextBlock}`,

    quiz: `You are an expert quiz creator for educational purposes. Generate a quiz based on the given topic.

Difficulty Level: ${difficulty}
${difficultyGuide[difficulty]}

You MUST respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct option text (must exactly match one of the options)"
    }
  ]
}

Guidelines:
- Generate exactly 5 questions
- Each question must have exactly 4 options
- The answer field must exactly match one of the options
- Questions should test understanding, not just memorization
- Vary question types: conceptual, applied, analytical
- Do NOT include any text outside the JSON object${contextBlock}`,

    flashcards: `You are an expert at creating study flashcards. Generate flashcards based on the given topic.

Difficulty Level: ${difficulty}
${difficultyGuide[difficulty]}

You MUST respond with ONLY valid JSON in this exact format:
{
  "flashcards": [
    {
      "question": "Front of card - the question or term",
      "answer": "Back of card - the answer or definition"
    }
  ]
}

Guidelines:
- Generate exactly 8 flashcards
- Keep questions clear and specific
- Keep answers concise but complete
- Cover the most important concepts
- Progress from fundamental to more advanced topics
- Do NOT include any text outside the JSON object${contextBlock}`,
  };

  return basePrompts[taskType];
}
