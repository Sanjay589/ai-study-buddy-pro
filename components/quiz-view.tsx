"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizViewProps {
  questions: QuizQuestion[];
  onScoreReport: (score: number, total: number) => void;
}

export function QuizView({ questions, onScoreReport }: QuizViewProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>(
    new Array(questions.length).fill(null)
  );
  const [showResults, setShowResults] = useState(false);

  const current = questions[currentQuestion];
  const selected = selectedAnswers[currentQuestion];

  const handleSelect = (option: string) => {
    if (showResults) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = option;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    const score = questions.reduce((acc, q, i) => {
      return acc + (selectedAnswers[i] === q.answer ? 1 : 0);
    }, 0);
    onScoreReport(score, questions.length);
  };

  const handleRetake = () => {
    setSelectedAnswers(new Array(questions.length).fill(null));
    setCurrentQuestion(0);
    setShowResults(false);
  };

  const score = questions.reduce((acc, q, i) => {
    return acc + (selectedAnswers[i] === q.answer ? 1 : 0);
  }, 0);

  const allAnswered = selectedAnswers.every((a) => a !== null);

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            {showResults && (
              <Badge
                variant={score >= questions.length * 0.7 ? "default" : "destructive"}
                className={
                  score >= questions.length * 0.7
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                Score: {score}/{questions.length}
              </Badge>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${((currentQuestion + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <Card className="border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          {current.question}
        </h3>

        <div className="flex flex-col gap-2">
          {current.options.map((option, index) => {
            const isSelected = selected === option;
            const isCorrect = option === current.answer;
            let optionStyle =
              "border-border bg-secondary/50 text-foreground hover:bg-secondary hover:border-primary/50";

            if (showResults) {
              if (isCorrect) {
                optionStyle =
                  "border-primary bg-primary/15 text-foreground";
              } else if (isSelected && !isCorrect) {
                optionStyle =
                  "border-destructive bg-destructive/15 text-foreground";
              } else {
                optionStyle = "border-border bg-secondary/30 text-muted-foreground";
              }
            } else if (isSelected) {
              optionStyle =
                "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30";
            }

            return (
              <button
                key={index}
                onClick={() => handleSelect(option)}
                disabled={showResults}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${optionStyle} ${
                  showResults ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option}</span>
                {showResults && isCorrect && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                )}
                {showResults && isSelected && !isCorrect && (
                  <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-border text-muted-foreground"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              className={`h-2 w-2 rounded-full transition-all ${
                i === currentQuestion
                  ? "w-6 bg-primary"
                  : selectedAnswers[i]
                    ? "bg-primary/40"
                    : "bg-secondary"
              }`}
              aria-label={`Go to question ${i + 1}`}
            />
          ))}
        </div>

        {currentQuestion === questions.length - 1 ? (
          showResults ? (
            <Button
              size="sm"
              onClick={handleRetake}
              className="bg-primary text-primary-foreground"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmitQuiz}
              disabled={!allAnswered}
              className="bg-primary text-primary-foreground disabled:opacity-50"
            >
              Submit Quiz
            </Button>
          )
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground"
            onClick={() =>
              setCurrentQuestion(
                Math.min(questions.length - 1, currentQuestion + 1)
              )
            }
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
