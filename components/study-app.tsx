"use client";

import { useState, useCallback, useId } from "react";
import {
  Lightbulb,
  FileText,
  HelpCircle,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StudySidebar } from "@/components/study-sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { ResultsDisplay } from "@/components/results-display";
import type { Difficulty, TaskType } from "@/lib/prompts";

interface StudyResult {
  type: TaskType;
  content?: string;
  data?: Record<string, unknown>;
  ragUsed?: boolean;
}

interface HistoryEntry {
  id: string;
  taskType: TaskType;
  input: string;
  result: StudyResult;
  timestamp: Date;
}

const taskButtons: {
  type: TaskType;
  label: string;
  icon: typeof Lightbulb;
  description: string;
}[] = [
  {
    type: "explain",
    label: "Explain",
    icon: Lightbulb,
    description: "Get a clear explanation",
  },
  {
    type: "summarize",
    label: "Summarize",
    icon: FileText,
    description: "Get a concise summary",
  },
  {
    type: "quiz",
    label: "Quiz",
    icon: HelpCircle,
    description: "Test your knowledge",
  },
  {
    type: "flashcards",
    label: "Flashcards",
    icon: Layers,
    description: "Create study cards",
  },
];

export function StudyApp() {
  const sessionPrefix = useId();
  const [sessionId] = useState(() => `session-${sessionPrefix}-${Date.now()}`);

  // ── State ──────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [activeTaskType, setActiveTaskType] = useState<TaskType | null>(null);
  const [result, setResult] = useState<StudyResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [chunksIndexed, setChunksIndexed] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [quizScores, setQuizScores] = useState<
    { score: number; total: number }[]
  >([]);

  // ── Adaptive difficulty based on quiz performance ──────────────────────
  const adjustDifficulty = useCallback(
    (score: number, total: number) => {
      setQuizScores((prev) => [...prev, { score, total }]);

      // Analyze recent quiz performance (last 3 quizzes)
      const recent = [...quizScores, { score, total }].slice(-3);
      const avgScore =
        recent.reduce((sum, q) => sum + q.score / q.total, 0) / recent.length;

      if (avgScore >= 0.85 && difficulty !== "advanced") {
        const next =
          difficulty === "beginner" ? "intermediate" : "advanced";
        setDifficulty(next);
        toast.success(
          `Great performance! Difficulty increased to ${next}.`
        );
      } else if (avgScore <= 0.4 && difficulty !== "beginner") {
        const next =
          difficulty === "advanced" ? "intermediate" : "beginner";
        setDifficulty(next);
        toast.info(
          `Difficulty adjusted to ${next} for better learning.`
        );
      }
    },
    [difficulty, quizScores]
  );

  // ── File upload handler ────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (text: string, fileName: string) => {
      setIsUploading(true);
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            sessionId,
            clearExisting: true,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setUploadedFileName(fileName);
        setChunksIndexed(data.chunksIndexed);
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload file"
        );
      } finally {
        setIsUploading(false);
      }
    },
    [sessionId]
  );

  // ── Central request handler ────────────────────────────────────────────
  const handleRequest = useCallback(
    async (taskType: TaskType) => {
      if (!userInput.trim()) {
        toast.error("Please enter some text or a topic to study.");
        return;
      }

      setIsLoading(true);
      setResult(null);
      setStreamedText("");
      setIsStreaming(false);
      setActiveTaskType(taskType);

      try {
        const response = await fetch("/api/study", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskType,
            userInput: userInput.trim(),
            difficulty,
            sessionId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Request failed";
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        // For quiz/flashcards, we get JSON back
        if (taskType === "quiz" || taskType === "flashcards") {
          const data = await response.json();
          const newResult: StudyResult = {
            type: data.type,
            data: data.data,
            ragUsed: data.ragUsed,
          };
          setResult(newResult);

          // Add to history
          setHistory((prev) => [
            {
              id: `${Date.now()}`,
              taskType,
              input: userInput.trim(),
              result: newResult,
              timestamp: new Date(),
            },
            ...prev,
          ]);
        } else {
          // For explain/summarize, stream the text
          setIsStreaming(true);
          const reader = response.body?.getReader();
          if (!reader) {
            console.log("[v0] No response body reader!");
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let fullText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            setStreamedText(fullText);
          }

          console.log("[v0] Stream finished, fullText length:", fullText.length, "preview:", fullText.slice(0, 100));

          setIsStreaming(false);
          const newResult: StudyResult = {
            type: taskType,
            content: fullText,
            ragUsed: false,
          };
          setResult(newResult);

          // Add to history
          setHistory((prev) => [
            {
              id: `${Date.now()}`,
              taskType,
              input: userInput.trim(),
              result: newResult,
              timestamp: new Date(),
            },
            ...prev,
          ]);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "An error occurred"
        );
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
      }
    },
    [userInput, difficulty, sessionId]
  );

  // ── Reset handler ──────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setUserInput("");
    setResult(null);
    setStreamedText("");
    setIsStreaming(false);
    setActiveTaskType(null);
    setUploadedFileName(null);
    setChunksIndexed(0);
    setHistory([]);
    setQuizScores([]);
    setDifficulty("intermediate");
    toast.info("Session reset.");
  }, []);

  const sidebarProps = {
    difficulty,
    onDifficultyChange: setDifficulty,
    onFileUpload: handleFileUpload,
    onReset: handleReset,
    uploadedFileName,
    isUploading,
    chunksIndexed,
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <StudySidebar {...sidebarProps} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile sidebar */}
        <MobileSidebar {...sidebarProps} />

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
            {/* Header */}
            {!result && !isStreaming && !streamedText && (
              <div className="mb-8 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    AI-Powered Learning
                  </span>
                </div>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                  What would you like to study?
                </h2>
                <p className="mt-3 text-pretty text-muted-foreground">
                  Enter a topic, paste your notes, or upload a file. Then choose
                  how you want to learn.
                </p>
              </div>
            )}

            {/* Input area */}
            <div className="mb-6">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter a topic, concept, or paste your study notes here..."
                className="min-h-32 resize-none border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                disabled={isLoading}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {userInput.length > 0
                    ? `${userInput.split(/\s+/).filter(Boolean).length} words`
                    : ""}
                </span>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground capitalize"
                >
                  {difficulty}
                </Badge>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {taskButtons.map(({ type, label, icon: Icon, description }) => (
                <button
                  key={type}
                  onClick={() => handleRequest(type)}
                  disabled={isLoading || !userInput.trim()}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Loading indicator */}
            {isLoading && !isStreaming && (
              <div className="mb-8 flex items-center justify-center gap-3 py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  Generating your content...
                </span>
              </div>
            )}

            {/* Results */}
            <ResultsDisplay
              result={result}
              streamedText={streamedText}
              isStreaming={isStreaming}
              activeTaskType={activeTaskType}
              onQuizScore={adjustDifficulty}
            />

            {/* History */}
            {history.length > 1 && (
              <div className="mt-12 border-t border-border pt-8">
                <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Session History
                </h3>
                <div className="flex flex-col gap-2">
                  {history.slice(1).map((entry) => {
                    const meta = taskButtons.find(
                      (b) => b.type === entry.taskType
                    );
                    const Icon = meta?.icon || Lightbulb;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {entry.input}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {meta?.label} -{" "}
                            {entry.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
