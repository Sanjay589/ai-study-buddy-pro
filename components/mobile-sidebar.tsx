"use client";

import { useState } from "react";
import { Menu, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudySidebar } from "@/components/study-sidebar";
import type { Difficulty } from "@/lib/prompts";

interface MobileSidebarProps {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onFileUpload: (text: string, fileName: string) => void;
  onReset: () => void;
  uploadedFileName: string | null;
  isUploading: boolean;
  chunksIndexed: number;
}

export function MobileSidebar(props: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="flex items-center gap-3 border-b border-border bg-card p-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Study Buddy Pro
        </span>
      </div>

      {/* Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <div className="relative h-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 text-muted-foreground"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
              <StudySidebar {...props} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
