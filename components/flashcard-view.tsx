"use client";

import { useState } from "react";
import { RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardViewProps {
  flashcards: Flashcard[];
}

export function FlashcardView({ flashcards }: FlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const current = flashcards[currentIndex];

  const handleFlip = () => setIsFlipped((prev) => !prev);

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card counter */}
      <p className="text-sm text-muted-foreground">
        Card {currentIndex + 1} of {flashcards.length}
      </p>

      {/* Flashcard */}
      <div
        className="perspective-1000 w-full max-w-lg cursor-pointer"
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
        aria-label={isFlipped ? "Showing answer. Click to show question." : "Showing question. Click to show answer."}
      >
        <div
          className={`relative transition-transform duration-500 preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              Question
            </span>
            <p className="text-lg font-medium leading-relaxed text-foreground">
              {current.question}
            </p>
            <span className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCw className="h-3 w-3" /> Click to reveal answer
            </span>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex min-h-56 flex-col items-center justify-center rounded-xl border border-primary/30 bg-primary/5 p-8 text-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <span className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              Answer
            </span>
            <p className="text-lg font-medium leading-relaxed text-foreground">
              {current.answer}
            </p>
            <span className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCw className="h-3 w-3" /> Click to show question
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="border-border text-muted-foreground"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous card"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex gap-1.5">
          {flashcards.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex(i);
              }}
              className={`h-2 w-2 rounded-full transition-all ${
                i === currentIndex ? "w-6 bg-primary" : "bg-secondary"
              }`}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="border-border text-muted-foreground"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          aria-label="Next card"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
