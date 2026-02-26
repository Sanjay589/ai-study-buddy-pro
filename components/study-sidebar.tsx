"use client";

import { Upload, RotateCcw, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Difficulty } from "@/lib/prompts";

interface StudySidebarProps {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onFileUpload: (text: string, fileName: string) => void;
  onReset: () => void;
  uploadedFileName: string | null;
  isUploading: boolean;
  chunksIndexed: number;
}

export function StudySidebar({
  difficulty,
  onDifficultyChange,
  onFileUpload,
  onReset,
  uploadedFileName,
  isUploading,
  chunksIndexed,
}: StudySidebarProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow .txt files
    if (!file.name.endsWith(".txt")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onFileUpload(text, file.name);
      }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = "";
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card p-6">
      {/* Logo / Title */}
      <div className="flex items-center gap-3 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Study Buddy Pro
          </h1>
          <p className="text-xs text-muted-foreground">AI-Powered Learning</p>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Difficulty Selector */}
      <div className="mb-6">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Difficulty Level
        </Label>
        <Select value={difficulty} onValueChange={(v) => onDifficultyChange(v as Difficulty)}>
          <SelectTrigger className="w-full bg-secondary text-secondary-foreground border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Upload Notes
        </Label>
        <label
          htmlFor="file-upload"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary hover:bg-secondary/50"
        >
          {isUploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Processing...
            </div>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Drop .txt file or click
              </span>
            </>
          )}
          <input
            id="file-upload"
            type="file"
            accept=".txt"
            className="sr-only"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>

        {/* Uploaded file indicator */}
        {uploadedFileName && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {uploadedFileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {chunksIndexed} chunks indexed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reset Button */}
      <Button
        variant="outline"
        className="w-full border-border text-muted-foreground hover:text-foreground"
        onClick={onReset}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset Session
      </Button>
    </aside>
  );
}
