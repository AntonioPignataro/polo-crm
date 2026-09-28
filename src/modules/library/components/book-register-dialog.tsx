"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  createBookSchema,
  groupTypeValues,
  type CreateBookInput,
} from "../schemas/book-schema";
import { createBook } from "../actions/create-book";
import {
  searchBooksByTitleAction,
  searchBookByIsbnAction,
} from "../actions/search-books-api";
import { BOOK_CATEGORY_LABELS } from "@/lib/constants";
import type { BookCategory } from "@/types";

interface BookRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookRegisterDialog({
  open,
  onOpenChange,
}: BookRegisterDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    Array<{ title: string; author: string | null; publisher: string | null; synopsis: string | null; coverUrl: string | null; isbn: string | null }>
  >([]);
  const [showResults, setShowResults] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateBookInput>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      publisher: "",
      bookCategory: undefined,
      synopsis: "",
      coverUrl: "",
      recommendations: [],
    },
  });

  const recommendations = watch("recommendations") ?? [];

  function toggleRecommendation(g: (typeof groupTypeValues)[number], on: boolean) {
    const current = new Set(recommendations);
    if (on) current.add(g);
    else current.delete(g);
    setValue(
      "recommendations",
      groupTypeValues.filter((v) => current.has(v)),
      { shouldValidate: true }
    );
  }

  const isbnValue = watch("isbn");
  const titleValue = watch("title");

  function handleClose() {
    reset();
    setServerError(null);
    setSearchResults([]);
    setShowResults(false);
    onOpenChange(false);
  }

  function handleSearchByIsbn() {
    if (!isbnValue || isbnValue.trim().length < 10) return;
    setIsSearching(true);
    setServerError(null);

    searchBookByIsbnAction(isbnValue.trim()).then((result) => {
      setIsSearching(false);
      if (result.success && result.data) {
        const book = result.data;
        setValue("title", book.title || "");
        setValue("author", book.author || "");
        setValue("publisher", book.publisher || "");
        // Auto-fill synopsis from subtitle or category
        const synopsisText = [book.subtitle, book.category].filter(Boolean).join(" - ");
        if (synopsisText) {
          setValue("synopsis", synopsisText);
        }
        if (book.coverUrl) {
          setValue("coverUrl", book.coverUrl);
        }
      } else {
        setServerError("Nenhum livro encontrado com este ISBN.");
      }
    });
  }

  function handleSearchByTitle() {
    if (!titleValue || titleValue.trim().length < 2) return;
    setIsSearching(true);
    setServerError(null);

    searchBooksByTitleAction(titleValue.trim()).then((result) => {
      setIsSearching(false);
      if (result.success && result.data.length > 0) {
        setSearchResults(
          result.data.map((b) => ({
            title: b.title,
            author: b.author,
            publisher: b.publisher,
            synopsis: [b.subtitle, b.category].filter(Boolean).join(" - ") || null,
            coverUrl: b.coverUrl,
            isbn: b.isbn,
          }))
        );
        setShowResults(true);
      } else {
        setServerError("Nenhum livro encontrado com este título.");
      }
    });
  }

  function handleSelectResult(result: (typeof searchResults)[number]) {
    setValue("title", result.title);
    setValue("author", result.author || "");
    setValue("publisher", result.publisher || "");
    if (result.synopsis) {
      setValue("synopsis", result.synopsis);
    }
    if (result.isbn) {
      setValue("isbn", result.isbn);
    }
    if (result.coverUrl) {
      setValue("coverUrl", result.coverUrl);
    }
    setShowResults(false);
    setSearchResults([]);
  }

  function onSubmit(data: CreateBookInput) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await createBook(data);
        if (result.success) {
          handleClose();
          router.refresh();
        } else {
          setServerError(result.error ?? "Erro ao cadastrar livro.");
        }
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "Erro inesperado."
        );
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => {
      if (!v) handleClose();
      else onOpenChange(v);
    }}>
      <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Cadastrar Livro</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Registre um novo livro no acervo do clube.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ISBN with search */}
          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN</Label>
            <div className="flex gap-2">
              <Input
                id="isbn"
                placeholder="Ex: 9788535914849"
                {...register("isbn")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleSearchByIsbn}
                disabled={isSearching || !isbnValue || isbnValue.trim().length < 10}
              >
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                <span className="ml-1">Buscar</span>
              </Button>
            </div>
          </div>

          {/* Title with search */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                placeholder="Título do livro"
                {...register("title")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleSearchByTitle}
                disabled={isSearching || !titleValue || titleValue.trim().length < 2}
              >
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                <span className="ml-1">Buscar</span>
              </Button>
            </div>
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="rounded-md border max-h-[200px] overflow-y-auto">
              {searchResults.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0 text-sm"
                  onClick={() => handleSelectResult(r)}
                >
                  <p className="font-medium">{r.title}</p>
                  {r.author && (
                    <p className="text-xs text-muted-foreground">{r.author}</p>
                  )}
                </button>
              ))}
              <button
                type="button"
                className="w-full text-left p-2 text-xs text-muted-foreground hover:bg-accent"
                onClick={() => {
                  setShowResults(false);
                  setSearchResults([]);
                }}
              >
                Fechar resultados
              </button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="author">Autor</Label>
            <Input
              id="author"
              placeholder="Autor do livro"
              {...register("author")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publisher">Editora</Label>
            <Input
              id="publisher"
              placeholder="Editora"
              {...register("publisher")}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria do Livro</Label>
            <Select
              onValueChange={(v) =>
                setValue("bookCategory", v as CreateBookInput["bookCategory"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(BOOK_CATEGORY_LABELS) as [
                    BookCategory,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">Sinopse</Label>
            <Textarea
              id="synopsis"
              placeholder="Sinopse do livro..."
              rows={3}
              {...register("synopsis")}
            />
          </div>

          <div className="space-y-2">
            <Label>Recomendação</Label>
            <div className="flex gap-4">
              {groupTypeValues.map((g) => (
                <label
                  key={g}
                  className="flex items-center gap-2 text-sm cursor-pointer select-none"
                >
                  <Checkbox
                    checked={recommendations.includes(g)}
                    onCheckedChange={(c) => toggleRecommendation(g, c === true)}
                  />
                  {g}
                </label>
              ))}
            </div>
            {errors.recommendations && (
              <p className="text-sm text-destructive">
                {errors.recommendations.message}
              </p>
            )}
          </div>

          {/* Hidden coverUrl */}
          <input type="hidden" {...register("coverUrl")} />

          {serverError && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
              {serverError}
            </p>
          )}

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Cadastrar Livro"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
