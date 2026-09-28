"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { GoogleBookData } from "@/lib/google-books";
import type { MemberForLoan } from "../queries/get-members-for-loan";
import { searchBooks } from "../actions/search-books";
import { loanBookWithSearch } from "../actions/loan-book-with-search";
import { BookSearchResults } from "./book-search-results";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "search" | "results" | "confirm";

interface LoanSearchDialogProps {
  members: MemberForLoan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoanSearchDialog({
  members,
  open,
  onOpenChange,
}: LoanSearchDialogProps) {
  const router = useRouter();
  const [isSearching, startSearch] = useTransition();
  const [isLoaning, startLoan] = useTransition();

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookData[]>([]);
  const [selectedBook, setSelectedBook] = useState<GoogleBookData | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  function reset() {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedBook(null);
    setSelectedMemberId("");
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  function handleSearch() {
    if (query.trim().length < 2) return;
    setError(null);

    startSearch(async () => {
      const res = await searchBooks({ query: query.trim() });
      if (res.success) {
        setResults(res.data);
        setStep("results");
      } else {
        setError(res.error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Select book
  // ---------------------------------------------------------------------------

  function handleSelectBook(book: GoogleBookData) {
    setSelectedBook(book);
    setStep("confirm");
    setError(null);
  }

  function handleContinueWithTitle() {
    setSelectedBook({ title: query.trim() } as GoogleBookData);
    setStep("confirm");
    setError(null);
  }

  // ---------------------------------------------------------------------------
  // Confirm loan
  // ---------------------------------------------------------------------------

  function handleConfirmLoan() {
    if (!selectedBook || !selectedMemberId) return;

    startLoan(async () => {
      const res = await loanBookWithSearch({
        memberId: selectedMemberId,
        title: selectedBook.title,
        subtitle: selectedBook.subtitle ?? null,
        author: selectedBook.author ?? null,
        isbn: selectedBook.isbn ?? null,
        publisher: selectedBook.publisher ?? null,
        category: selectedBook.category ?? null,
        publishedDate: selectedBook.publishedDate ?? null,
        pageCount: selectedBook.pageCount ?? null,
        language: selectedBook.language ?? null,
        coverUrl: selectedBook.coverUrl ?? null,
      });

      if (res.success) {
        handleOpenChange(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Emprestar Livro</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {step === "search" && "Busque o livro pelo título."}
            {step === "results" && "Selecione o livro correto."}
            {step === "confirm" && "Selecione o sócio e confirme o empréstimo."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Step 1: Search */}
        {step === "search" && (
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o título do livro..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
              />
              <Button
                onClick={handleSearch}
                disabled={query.trim().length < 2 || isSearching}
                size="icon"
                className="shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Step 2: Results */}
        {step === "results" && (
          <div className="space-y-3 py-2">
            {results.length > 0 ? (
              <>
                <BookSearchResults
                  results={results}
                  onSelect={handleSelectBook}
                />
                <div className="border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={handleContinueWithTitle}
                  >
                    Nenhum resultado correto? Continuar com &ldquo;{query}
                    &rdquo;
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <BookOpen className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado encontrado para &ldquo;{query}&rdquo;.
                </p>
                <Button
                  variant="outline"
                  onClick={handleContinueWithTitle}
                >
                  Continuar com este título
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("search")}
            >
              <ArrowLeft className="mr-1 size-3" />
              Buscar novamente
            </Button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && selectedBook && (
          <div className="space-y-4 py-2">
            {/* Book preview */}
            <div className="flex items-start gap-3 rounded-lg border p-3">
              {selectedBook.coverUrl ? (
                <img
                  src={selectedBook.coverUrl}
                  alt={selectedBook.title}
                  className="h-16 w-11 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-muted">
                  <BookOpen className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{selectedBook.title}</p>
                {selectedBook.author && (
                  <p className="text-xs text-muted-foreground">
                    {selectedBook.author}
                  </p>
                )}
              </div>
            </div>

            {/* Member selector */}
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um sócio" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedBook(null);
                setStep("results");
                setError(null);
              }}
            >
              <ArrowLeft className="mr-1 size-3" />
              Voltar
            </Button>
          </div>
        )}

        {/* Footer for confirm step */}
        {step === "confirm" && (
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoaning}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmLoan}
              disabled={!selectedMemberId || isLoaning}
            >
              {isLoaning ? "Registrando..." : "Confirmar Empréstimo"}
            </Button>
          </ResponsiveDialogFooter>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
