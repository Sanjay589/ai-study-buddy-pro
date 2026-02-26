"use client";

import { Lightbulb, FileText, HelpCircle, Layers, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuizView } from "@/components/quiz-view";
import { FlashcardView } from "@/components/flashcard-view";

interface StudyResult {
  type: "explain" | "summarize" | "quiz" | "flashcards";
  content?: string;
  data?: Record<string, unknown>;
  ragUsed?: boolean;
}

interface ResultsDisplayProps {
  result: StudyResult | null;
  streamedText: string;
  isStreaming: boolean;
  activeTaskType: "explain" | "summarize" | "quiz" | "flashcards" | null;
  onQuizScore: (score: number, total: number) => void;
}

const taskMeta = {
  explain: { label: "Explanation", icon: Lightbulb },
  summarize: { label: "Summary", icon: FileText },
  quiz: { label: "Quiz", icon: HelpCircle },
  flashcards: { label: "Flashcards", icon: Layers },
};

export function ResultsDisplay({
  result,
  streamedText,
  isStreaming,
  activeTaskType,
  onQuizScore,
}: ResultsDisplayProps) {
  // Streaming text (explain/summarize)
  if (isStreaming || (streamedText && !result)) {
    const type = activeTaskType || "explain";
    const meta = taskMeta[type];
    const Icon = meta.icon;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{meta.label}</h2>
          {isStreaming && (
            <div className="ml-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Generating...</span>
            </div>
          )}
        </div>
        <div className="prose prose-invert max-w-none rounded-lg border border-border bg-card p-6 text-foreground">
          <MarkdownContent text={streamedText} />
        </div>
      </div>
    );
  }

  if (!result) return null;

  const meta = taskMeta[result.type];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{meta.label}</h2>
        {result.ragUsed && (
          <Badge
            variant="outline"
            className="ml-2 border-primary/30 text-primary"
          >
            <Database className="mr-1 h-3 w-3" />
            RAG Enhanced
          </Badge>
        )}
      </div>

      {/* Quiz output */}
      {result.type === "quiz" && result.data && (
        <QuizView
          questions={
            (result.data as { questions: { question: string; options: string[]; answer: string }[] })
              .questions
          }
          onScoreReport={onQuizScore}
        />
      )}

      {/* Flashcard output */}
      {result.type === "flashcards" && result.data && (
        <FlashcardView
          flashcards={
            (result.data as { flashcards: { question: string; answer: string }[] })
              .flashcards
          }
        />
      )}

      {/* Text output (explain/summarize) */}
      {(result.type === "explain" || result.type === "summarize") &&
        result.content && (
          <div className="prose prose-invert max-w-none rounded-lg border border-border bg-card p-6 text-foreground">
            <MarkdownContent text={result.content} />
          </div>
        )}
    </div>
  );
}

/**
 * Simple markdown renderer that handles headings, bold, lists, and code blocks.
 * Avoids pulling in a heavy markdown library.
 */
function MarkdownContent({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = "";
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={key++}
            className="my-3 overflow-x-auto rounded-md bg-secondary p-4 text-sm text-foreground"
          >
            <code>{codeContent}</code>
          </pre>
        );
        codeContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={key++}
          className="mt-4 mb-2 text-base font-semibold text-foreground"
        >
          {formatInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          className="mt-5 mb-2 text-lg font-bold text-foreground"
        >
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={key++}
          className="mt-6 mb-3 text-xl font-bold text-foreground"
        >
          {formatInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={key++} className="ml-4 text-sm leading-relaxed text-foreground">
          {formatInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={key++} className="ml-4 list-decimal text-sm leading-relaxed text-foreground">
          {formatInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<br key={key++} />);
    } else {
      elements.push(
        <p key={key++} className="text-sm leading-relaxed text-foreground">
          {formatInline(line)}
        </p>
      );
    }
  }

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

/**
 * Format inline markdown: **bold**, *italic*, `code`
 */
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`(.+?)`/);
    // Italic
    const italicMatch = remaining.match(/\*(.+?)\*/);

    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
      italicMatch
        ? { type: "italic", match: italicMatch, index: italicMatch.index! }
        : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(
        <strong key={partKey++} className="font-semibold text-foreground">
          {first.match![1]}
        </strong>
      );
      remaining = remaining.slice(first.index + first.match![0].length);
    } else if (first.type === "code") {
      parts.push(
        <code
          key={partKey++}
          className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono text-primary"
        >
          {first.match![1]}
        </code>
      );
      remaining = remaining.slice(first.index + first.match![0].length);
    } else if (first.type === "italic") {
      parts.push(
        <em key={partKey++}>{first.match![1]}</em>
      );
      remaining = remaining.slice(first.index + first.match![0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}
