"use client";

import { Fragment, useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  BookCheck,
  BookX,
  Search,
  ArrowLeftRight,
  Star,
  Plus,
  BookPlus,
  Info,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { StatStrip } from "@/shared/components/stat-strip";
import { BOOK_CATEGORY_LABELS } from "@/lib/constants";
import type { BookListItem } from "../queries/get-books";
import type { MemberForLoan } from "../queries/get-members-for-loan";
import { loanBook } from "../actions/loan-book";
import { returnBook } from "../actions/return-book";
import { BookRegisterDialog } from "./book-register-dialog";
import { BookEditDialog } from "./book-edit-dialog";
import type { BookCategory } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LibraryViewProps {
  books: BookListItem[];
  members: MemberForLoan[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LibraryView({ books, members }: LibraryViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search state
  const [search, setSearch] = useState("");

  // Show archived books in the list (admin escape hatch — default off)
  const [showArchived, setShowArchived] = useState(false);

  // Register dialog state
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  // Edit dialog state (driven by selected book ID)
  const [editBookId, setEditBookId] = useState<string | null>(null);

  // Loan dialog state
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [selectedBookForLoan, setSelectedBookForLoan] =
    useState<BookListItem | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [loanError, setLoanError] = useState<string | null>(null);

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedBookForReturn, setSelectedBookForReturn] =
    useState<BookListItem | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnFinished, setReturnFinished] = useState(false);
  const [returnResult, setReturnResult] = useState<{
    bookTitle: string;
    memberName: string;
    polarPoints: number;
    finished: boolean;
  } | null>(null);

  // Active (non-archived) books drive the stats — archived books are out of
  // the catalog and shouldn't inflate counts.
  const activeBooks = useMemo(
    () => books.filter((b) => !b.archivedAt),
    [books]
  );
  const totalBooks = activeBooks.length;
  const availableBooks = activeBooks.filter((b) => b.status === "DISPONIVEL").length;
  const borrowedBooks = activeBooks.filter((b) => b.status === "EMPRESTADO").length;

  // Filtered books — hide archived unless user toggled them on, then apply
  // text search.
  const filteredBooks = useMemo(() => {
    const visible = showArchived ? books : activeBooks;
    if (!search) return visible;
    const term = search.toLowerCase();
    return visible.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        (b.author && b.author.toLowerCase().includes(term))
    );
  }, [books, activeBooks, showArchived, search]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpenLoan(book: BookListItem) {
    setSelectedBookForLoan(book);
    setSelectedMemberId("");
    setLoanError(null);
    setLoanDialogOpen(true);
  }

  function handleOpenReturn(book: BookListItem) {
    setSelectedBookForReturn(book);
    setReturnError(null);
    setReturnResult(null);
    setReturnFinished(false);
    setReturnDialogOpen(true);
  }

  function handleConfirmLoan() {
    if (!selectedBookForLoan || !selectedMemberId) return;

    startTransition(async () => {
      const result = await loanBook({
        bookId: selectedBookForLoan.id,
        memberId: selectedMemberId,
      });

      if (result.success) {
        setLoanDialogOpen(false);
        setSelectedBookForLoan(null);
        setSelectedMemberId("");
        setLoanError(null);
        router.refresh();
      } else {
        setLoanError(result.error);
      }
    });
  }

  function handleConfirmReturn() {
    if (!selectedBookForReturn) return;

    startTransition(async () => {
      const result = await returnBook({
        bookId: selectedBookForReturn.id,
        finished: returnFinished,
      });

      if (result.success) {
        setReturnResult({ ...result.data, finished: returnFinished });
        // Keep dialog open to show success message, then close
        setTimeout(() => {
          setReturnDialogOpen(false);
          setSelectedBookForReturn(null);
          setReturnResult(null);
          setReturnFinished(false);
          router.refresh();
        }, 2500);
      } else {
        setReturnError(result.error);
      }
    });
  }

  function categoryLabel(cat: BookCategory | null): string | null {
    if (!cat) return null;
    return BOOK_CATEGORY_LABELS[cat] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Biblioteca</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie o acervo e empréstimos de livros do clube.
        </p>
      </div>

      {/* Stats Cards */}
      <StatStrip desktopCols={3}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Total de Livros
            </CardDescription>
            <BookOpen className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBooks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Disponíveis
            </CardDescription>
            <BookCheck className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableBooks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Emprestados
            </CardDescription>
            <BookX className="size-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{borrowedBooks}</div>
          </CardContent>
        </Card>
      </StatStrip>

      {/* Search + Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por título ou autor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox
            checked={showArchived}
            onCheckedChange={(v) => setShowArchived(v === true)}
          />
          Mostrar livros removidos
        </label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRegisterDialogOpen(true)}>
            <BookPlus className="mr-1 size-4" />
            Cadastrar Livro
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredBooks.length === 0 ? (
            <p className="text-muted-foreground h-24 text-center flex items-center justify-center">
              Nenhum livro encontrado.
            </p>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Recomendação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Emprestado para</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooks.map((book) => {
                      const isArchived = !!book.archivedAt;
                      return (
                      <TableRow
                        key={book.id}
                        className={isArchived ? "opacity-60" : undefined}
                      >
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1.5">
                            {book.title}
                            {book.synopsis && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{book.synopsis}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {book.author ?? (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {categoryLabel(book.bookCategory) ?? (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {book.recommendations.length > 0 ? (
                            <Badge
                              variant="outline"
                              className={`text-xs flex items-center w-[6.5rem] ${
                                book.recommendations.length === 1
                                  ? "justify-center"
                                  : book.recommendations.length === 2
                                    ? "justify-evenly"
                                    : "justify-between"
                              }`}
                            >
                              {book.recommendations.map((g, i) => (
                                <Fragment key={g}>
                                  {i > 0 && (
                                    <span className="text-muted-foreground/50">
                                      ·
                                    </span>
                                  )}
                                  <span>{g}</span>
                                </Fragment>
                              ))}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isArchived ? (
                            <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200">
                              Removido
                            </Badge>
                          ) : (
                            <Badge
                              className={
                                book.status === "DISPONIVEL"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-orange-100 text-orange-800 hover:bg-orange-100"
                              }
                            >
                              {book.status === "DISPONIVEL"
                                ? "Disponível"
                                : "Emprestado"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {book.borrowedByName ?? (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditBookId(book.id)}
                              disabled={isPending}
                            >
                              <Pencil className="mr-1 size-3" />
                              Editar
                            </Button>
                            {isArchived ? null : book.status === "DISPONIVEL" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-w-[9rem]"
                                onClick={() => handleOpenLoan(book)}
                                disabled={isPending}
                              >
                                <ArrowLeftRight className="mr-1 size-3" />
                                Emprestar
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-w-[9rem]"
                                onClick={() => handleOpenReturn(book)}
                                disabled={isPending}
                              >
                                <BookCheck className="mr-1 size-3" />
                                Devolver
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Cards */}
              <div className="space-y-3 md:hidden">
                {filteredBooks.map((book) => {
                  const isArchived = !!book.archivedAt;
                  return (
                  <div
                    key={book.id}
                    className={`rounded-lg border p-3 space-y-2 ${isArchived ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{book.title}</span>
                      {isArchived ? (
                        <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200 shrink-0">
                          Removido
                        </Badge>
                      ) : (
                        <Badge
                          className={
                            book.status === "DISPONIVEL"
                              ? "bg-green-100 text-green-800 hover:bg-green-100 shrink-0"
                              : "bg-orange-100 text-orange-800 hover:bg-orange-100 shrink-0"
                          }
                        >
                          {book.status === "DISPONIVEL" ? "Disponível" : "Emprestado"}
                        </Badge>
                      )}
                    </div>
                    {book.author && (
                      <p className="text-xs text-muted-foreground">
                        {book.author}
                      </p>
                    )}
                    {categoryLabel(book.bookCategory) && (
                      <p className="text-xs text-muted-foreground">
                        Categoria: {categoryLabel(book.bookCategory)}
                      </p>
                    )}
                    {book.recommendations.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Recomendação:</span>
                        <Badge
                          variant="outline"
                          className={`text-xs flex items-center w-[6.5rem] ${
                            book.recommendations.length === 1
                              ? "justify-center"
                              : book.recommendations.length === 2
                                ? "justify-evenly"
                                : "justify-between"
                          }`}
                        >
                          {book.recommendations.map((g, i) => (
                            <Fragment key={g}>
                              {i > 0 && (
                                <span className="text-muted-foreground/50">·</span>
                              )}
                              <span>{g}</span>
                            </Fragment>
                          ))}
                        </Badge>
                      </div>
                    )}
                    {book.borrowedByName && (
                      <p className="text-xs text-muted-foreground">
                        Emprestado para: {book.borrowedByName}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditBookId(book.id)}
                        disabled={isPending}
                      >
                        <Pencil className="mr-1 size-3" />
                        Editar
                      </Button>
                      {isArchived ? null : book.status === "DISPONIVEL" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-[9rem]"
                          onClick={() => handleOpenLoan(book)}
                          disabled={isPending}
                        >
                          <ArrowLeftRight className="mr-1 size-3" />
                          Emprestar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-[9rem]"
                          onClick={() => handleOpenReturn(book)}
                          disabled={isPending}
                        >
                          <BookCheck className="mr-1 size-3" />
                          Devolver
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Book Register Dialog */}
      <BookRegisterDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
      />

      {/* Book Edit Dialog */}
      <BookEditDialog
        bookId={editBookId}
        onClose={() => setEditBookId(null)}
      />

      {/* Loan Dialog */}
      <ResponsiveDialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Emprestar Livro</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Selecione o sócio que irá receber o livro{" "}
              <strong>{selectedBookForLoan?.title}</strong>.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-2">
            {selectedBookForLoan && selectedBookForLoan.recommendations.length > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Recomendado para:</span>
                <Badge
                  variant="outline"
                  className={`text-xs flex items-center w-[6.5rem] ${
                    selectedBookForLoan.recommendations.length === 1
                      ? "justify-center"
                      : selectedBookForLoan.recommendations.length === 2
                        ? "justify-evenly"
                        : "justify-between"
                  }`}
                >
                  {selectedBookForLoan.recommendations.map((g, i) => (
                    <Fragment key={g}>
                      {i > 0 && (
                        <span className="text-muted-foreground/50">·</span>
                      )}
                      <span>{g}</span>
                    </Fragment>
                  ))}
                </Badge>
              </div>
            )}
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
            {loanError && (
              <p className="text-sm text-red-600">{loanError}</p>
            )}
          </div>
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => setLoanDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmLoan}
              disabled={!selectedMemberId || isPending}
            >
              {isPending ? "Registrando..." : "Confirmar Empréstimo"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Return Dialog */}
      <ResponsiveDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Devolver Livro</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {returnResult ? (
                <>
                  Devolução registrada com sucesso!
                </>
              ) : (
                <>
                  Confirmar a devolução do livro{" "}
                  <strong>{selectedBookForReturn?.title}</strong> por{" "}
                  <strong>{selectedBookForReturn?.borrowedByName}</strong>?
                </>
              )}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {returnResult ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <Star className="size-5 text-yellow-500" />
              <div>
                {returnResult.finished && returnResult.polarPoints > 0 ? (
                  <p className="text-sm font-medium">
                    {returnResult.memberName} recebeu{" "}
                    <strong>{returnResult.polarPoints} polares</strong> pela
                    leitura do livro &ldquo;{returnResult.bookTitle}&rdquo;.
                  </p>
                ) : (
                  <p className="text-sm font-medium">
                    Livro &ldquo;{returnResult.bookTitle}&rdquo; devolvido por{" "}
                    {returnResult.memberName}.
                    {!returnResult.finished && " Livro não finalizado — polares não atribuídos."}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <BookCheck className="size-5 text-blue-500 mt-0.5" />
                <div className="space-y-3 flex-1">
                  <p className="text-sm">
                    Este livro foi finalizado?
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="finished"
                      checked={returnFinished}
                      onCheckedChange={(checked) =>
                        setReturnFinished(checked === true)
                      }
                    />
                    <Label
                      htmlFor="finished"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Sim, o sócio finalizou a leitura
                    </Label>
                  </div>
                  {returnFinished && (
                    <p className="text-xs text-muted-foreground">
                      Polares serão atribuídos automaticamente ao sócio.
                    </p>
                  )}
                  {!returnFinished && (
                    <p className="text-xs text-muted-foreground">
                      O livro será devolvido sem atribuição de polares.
                    </p>
                  )}
                </div>
              </div>
              {returnError && (
                <p className="text-sm text-red-600">{returnError}</p>
              )}
            </div>
          )}

          {!returnResult && (
            <ResponsiveDialogFooter>
              <Button
                variant="outline"
                onClick={() => setReturnDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmReturn} disabled={isPending}>
                {isPending ? "Registrando..." : "Confirmar Devolução"}
              </Button>
            </ResponsiveDialogFooter>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
