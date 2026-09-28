"use client";

import { BookOpen } from "lucide-react";
import type { GoogleBookData } from "@/lib/google-books";

interface BookSearchResultsProps {
  results: GoogleBookData[];
  onSelect: (book: GoogleBookData) => void;
}

export function BookSearchResults({
  results,
  onSelect,
}: BookSearchResultsProps) {
  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {results.map((book, idx) => (
        <button
          key={`${book.isbn ?? idx}`}
          type="button"
          className="w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
          onClick={() => onSelect(book)}
        >
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-16 w-11 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-muted">
              <BookOpen className="size-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{book.title}</p>
            {book.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {book.subtitle}
              </p>
            )}
            {book.author && (
              <p className="text-xs text-muted-foreground mt-1">
                {book.author}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {book.publisher && <span>{book.publisher}</span>}
              {book.pageCount && <span>· {book.pageCount} pag.</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
