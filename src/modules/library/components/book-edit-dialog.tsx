"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  updateBookSchema,
  groupTypeValues,
  type UpdateBookInput,
} from "../schemas/book-schema";
import { updateBook } from "../actions/update-book";
import { archiveBook } from "../actions/archive-book";
import { unarchiveBook } from "../actions/unarchive-book";
import { getBookForEdit } from "../queries/get-book-for-edit";
import { BOOK_CATEGORY_LABELS } from "@/lib/constants";
import type { BookCategory } from "@/types";

interface BookEditDialogProps {
  bookId: string | null;
  onClose: () => void;
}

export function BookEditDialog({ bookId, onClose }: BookEditDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, startArchiveTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateBookInput>({
    resolver: zodResolver(updateBookSchema),
    defaultValues: {
      id: "",
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

  const categoryValue = watch("bookCategory");
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

  useEffect(() => {
    if (!bookId) {
      reset();
      setServerError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setServerError(null);
    setArchiveError(null);
    getBookForEdit(bookId)
      .then((book) => {
        if (cancelled) return;
        setLoading(false);
        if (!book) {
          setServerError("Livro não encontrado.");
          return;
        }
        setIsArchived(book.archivedAt !== null);
        reset({
          id: book.id,
          title: book.title,
          author: book.author ?? "",
          isbn: book.isbn ?? "",
          publisher: book.publisher ?? "",
          bookCategory: book.bookCategory ?? undefined,
          synopsis: book.synopsis ?? "",
          coverUrl: book.coverUrl ?? "",
          recommendations: book.recommendations,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setServerError("Erro ao carregar livro.");
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, reset]);

  function handleClose() {
    reset();
    setServerError(null);
    setArchiveError(null);
    setConfirmArchiveOpen(false);
    setIsArchived(false);
    onClose();
  }

  function handleConfirmArchive() {
    if (!bookId) return;
    setArchiveError(null);
    startArchiveTransition(async () => {
      const action = isArchived ? unarchiveBook : archiveBook;
      const result = await action(bookId);
      if (result.success) {
        setConfirmArchiveOpen(false);
        handleClose();
        router.refresh();
      } else {
        setArchiveError(result.error);
      }
    });
  }

  function onSubmit(data: UpdateBookInput) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await updateBook(data);
        if (result.success) {
          handleClose();
          router.refresh();
        } else {
          setServerError(result.error ?? "Erro ao atualizar livro.");
        }
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "Erro inesperado."
        );
      }
    });
  }

  return (
    <ResponsiveDialog
      open={!!bookId}
      onOpenChange={(v) => !v && handleClose()}
    >
      <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Editar Livro</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Altere os dados do livro. O histórico de empréstimos é preservado.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {loading && (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Carregando...
          </p>
        )}

        {!loading && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("id")} />

            <div className="space-y-2">
              <Label htmlFor="edit-book-isbn">ISBN</Label>
              <Input
                id="edit-book-isbn"
                placeholder="Ex: 9788535914849"
                {...register("isbn")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-book-title">Título *</Label>
              <Input
                id="edit-book-title"
                placeholder="Título do livro"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-book-author">Autor</Label>
              <Input
                id="edit-book-author"
                placeholder="Autor do livro"
                {...register("author")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-book-publisher">Editora</Label>
              <Input
                id="edit-book-publisher"
                placeholder="Editora"
                {...register("publisher")}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria do Livro</Label>
              <Select
                value={categoryValue ?? ""}
                onValueChange={(v) =>
                  setValue("bookCategory", v as UpdateBookInput["bookCategory"])
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
              <Label htmlFor="edit-book-synopsis">Sinopse</Label>
              <Textarea
                id="edit-book-synopsis"
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
              {isArchived ? (
                <Button
                  type="button"
                  variant="outline"
                  className="sm:mr-auto"
                  onClick={() => {
                    setArchiveError(null);
                    setConfirmArchiveOpen(true);
                  }}
                >
                  <ArchiveRestore className="mr-1 size-4" />
                  Restaurar ao acervo
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="sm:mr-auto text-destructive hover:text-destructive"
                  onClick={() => {
                    setArchiveError(null);
                    setConfirmArchiveOpen(true);
                  }}
                >
                  <Archive className="mr-1 size-4" />
                  Remover do acervo
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        )}

        <AlertDialog
          open={confirmArchiveOpen}
          onOpenChange={(open) => {
            if (!isArchiving) setConfirmArchiveOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isArchived
                  ? "Restaurar livro ao acervo?"
                  : "Remover livro do acervo?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isArchived
                  ? "Este livro voltará a aparecer na lista de livros disponíveis e poderá ser emprestado novamente."
                  : "Este livro deixará de aparecer na lista de livros disponíveis e não poderá mais ser emprestado. O histórico de empréstimos e os polares já atribuídos são totalmente preservados — você pode restaurá-lo ao acervo a qualquer momento."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {archiveError && (
              <p className="text-sm text-destructive">{archiveError}</p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isArchiving}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmArchive();
                }}
                disabled={isArchiving}
                className={
                  isArchived
                    ? undefined
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }
              >
                {isArchiving
                  ? isArchived
                    ? "Restaurando..."
                    : "Removendo..."
                  : isArchived
                    ? "Restaurar"
                    : "Remover"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
