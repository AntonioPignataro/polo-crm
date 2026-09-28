"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Star,
  Trophy,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PolarCategory, UserRole } from "@/types";
import type { MemberForLancamento } from "../queries/get-members-for-lancamento";
import type { PolarConfigItem } from "../queries/get-polar-configs";
import type { RankingItem } from "../queries/get-polar-ranking";
import { savePolares } from "../actions/save-polares";
import { savePolarConfigs, type SavePolarConfigsInput } from "../actions/save-polar-configs";
import { getPolaresForDate } from "../queries/get-polares-for-date";
import {
  CHECKBOX_LANCAMENTO_CATEGORIES,
  ADDITIVE_LANCAMENTO_CATEGORIES,
  LANCAMENTO_CATEGORIES,
} from "../lancamento-categories";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** Categories that use a free-input field instead of a checkbox */
const INPUT_CATEGORIES: Set<PolarCategory> = new Set(["OUTROS_PONTOS"]);

/** All categories for ranking display */
const ALL_CATEGORIES: PolarCategory[] = [
  "PRESENCA",
  "PONTUALIDADE",
  "AMIGO",
  "ESPORTE",
  "ENCARGO",
  "MULTA",
  "EXERCICIO",
  "BOLETIM",
  "RESUMO",
  "OUTROS_PONTOS",
  "LIVRO",
];

/** Categories configurable in the Atribuição tab (excludes OUTROS_PONTOS — uses per-entry custom values) */
const CONFIGURABLE_CATEGORIES: PolarCategory[] = [
  "PRESENCA",
  "PONTUALIDADE",
  "AMIGO",
  "ESPORTE",
  "ENCARGO",
  "MULTA",
  "EXERCICIO",
  "BOLETIM",
  "RESUMO",
  "LIVRO",
];

/** Categories whose negative values should be shown in red */
const NEGATIVE_CATS: Set<PolarCategory> = new Set(["MULTA", "OUTROS_PONTOS"]);

const CATEGORY_LABELS: Record<PolarCategory, string> = {
  PRESENCA: "Presença",
  PONTUALIDADE: "Pontualidade",
  AMIGO: "Amigo",
  ESPORTE: "Esporte",
  ENCARGO: "Encargo",
  MULTA: "Multa",
  EXERCICIO: "Exercício",
  BOLETIM: "Boletim",
  RESUMO: "Resumo",
  OUTROS_PONTOS: "Outros pontos",
  LIVRO: "Livro",
};

// Roles that can see each tab
const LANCAMENTO_ROLES: Set<UserRole> = new Set([
  "SUPER_ADMIN",
  "DIRETOR",
  "PRECEPTOR",
  "MONITOR",
]);
const ATRIBUICAO_ROLES: Set<UserRole> = new Set(["SUPER_ADMIN", "DIRETOR"]);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PolaresTabsProps {
  members: MemberForLancamento[];
  polarConfigs: PolarConfigItem[];
  ranking: RankingItem[];
  userRole: UserRole;
  initialDate: string;
  initialChecked: Record<string, PolarCategory[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function buildCheckedMap(
  data: Record<string, PolarCategory[]>
): Map<string, Set<PolarCategory>> {
  const map = new Map<string, Set<PolarCategory>>();
  for (const [memberId, categories] of Object.entries(data)) {
    if (categories.length > 0) map.set(memberId, new Set(categories));
  }
  return map;
}

export function PolaresTabs({
  members,
  polarConfigs,
  ranking,
  userRole,
  initialDate,
  initialChecked,
}: PolaresTabsProps) {
  const isMobile = useIsMobile();
  const [expandedRanking, setExpandedRanking] = useState<string | null>(null);

  // Build a config map for quick lookup
  const configMap = new Map<PolarCategory, PolarConfigItem>(
    polarConfigs.map((c) => [c.category, c])
  );

  const canLancamento = LANCAMENTO_ROLES.has(userRole);
  const canAtribuicao = ATRIBUICAO_ROLES.has(userRole);
  const defaultTab = canLancamento ? "lançamento" : "ranking";

  // ---- Lançamento state ----
  const [date, setDate] = useState(initialDate);

  // Checkbox state: Map<memberId, Set<category>>. Initialized from server-side
  // fetch for `initialDate` — when the user picks a different date, we refetch
  // and replace this map (mirrors how the attendance screen behaves).
  const [checked, setChecked] = useState<Map<string, Set<PolarCategory>>>(() =>
    buildCheckedMap(initialChecked)
  );

  // Input field state for OUTROS_PONTOS: Map<memberId, Map<category, value>>.
  // Intentionally NOT loaded from server — OUTROS_PONTOS is additive, the
  // input always starts blank for each date.
  const [inputValues, setInputValues] = useState<
    Map<string, Map<PolarCategory, number>>
  >(() => new Map());

  // Display values for text inputs (stores raw strings like "-", "-5", "3")
  const [inputDisplay, setInputDisplay] = useState<
    Map<string, Map<PolarCategory, string>>
  >(new Map());

  const [isPending, startTransition] = useTransition();
  const [isFetching, startFetchTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Skip the initial-mount fetch (page already provided initialChecked for
  // initialDate). Refetch only on subsequent date changes.
  const isFirstDateRender = useRef(true);
  useEffect(() => {
    if (isFirstDateRender.current) {
      isFirstDateRender.current = false;
      return;
    }
    setMessage(null);
    setInputDisplay(new Map());
    setInputValues(new Map());
    startFetchTransition(async () => {
      const data = await getPolaresForDate(date);
      setChecked(buildCheckedMap(data));
    });
  }, [date]);

  // ---- Atribuição state ----
  const [configValues, setConfigValues] = useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      for (const cat of CONFIGURABLE_CATEGORIES) {
        const config = configMap.get(cat);
        initial[cat] = config?.defaultPoints ?? 0;
      }
      return initial;
    }
  );
  const [isPendingConfigs, startConfigTransition] = useTransition();
  const [configMessage, setConfigMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ---- Lançamento handlers ----

  const togglePolar = useCallback(
    (memberId: string, category: PolarCategory) => {
      setChecked((prev) => {
        const next = new Map(prev);
        const memberSet = new Set(next.get(memberId) ?? []);
        if (memberSet.has(category)) {
          memberSet.delete(category);
        } else {
          memberSet.add(category);
        }
        if (memberSet.size === 0) {
          next.delete(memberId);
        } else {
          next.set(memberId, memberSet);
        }
        return next;
      });
    },
    []
  );

  const isChecked = useCallback(
    (memberId: string, category: PolarCategory): boolean => {
      return checked.get(memberId)?.has(category) ?? false;
    },
    [checked]
  );

  const getInputValue = useCallback(
    (memberId: string, category: PolarCategory): string => {
      const raw = inputDisplay.get(memberId)?.get(category);
      if (raw !== undefined) return raw;
      const val = inputValues.get(memberId)?.get(category);
      return val !== undefined ? String(val) : "";
    },
    [inputValues, inputDisplay]
  );

  const setInputValue = useCallback(
    (memberId: string, category: PolarCategory, raw: string) => {
      // OUTROS_PONTOS: allow empty, "-", optional negative sign + digits
      if (raw !== "" && raw !== "-" && !/^-?\d+$/.test(raw)) return;

      // Update display string
      setInputDisplay((prev) => {
        const next = new Map(prev);
        const memberMap = new Map(next.get(memberId) ?? []);
        if (raw === "") memberMap.delete(category);
        else memberMap.set(category, raw);
        if (memberMap.size === 0) next.delete(memberId);
        else next.set(memberId, memberMap);
        return next;
      });

      // Update parsed numeric value
      const parsed = parseInt(raw);
      setInputValues((prev) => {
        const next = new Map(prev);
        const memberMap = new Map(next.get(memberId) ?? []);
        if (isNaN(parsed)) {
          memberMap.delete(category);
        } else {
          memberMap.set(category, parsed);
        }
        if (memberMap.size === 0) next.delete(memberId);
        else next.set(memberId, memberMap);
        return next;
      });
    },
    []
  );

  /** On blur for input: clear transient "-" if user didn't type a number */
  const handleInputBlur = useCallback(
    (memberId: string, category: PolarCategory) => {
      const raw = inputDisplay.get(memberId)?.get(category);
      if (raw === "-") {
        setInputDisplay((prev) => {
          const next = new Map(prev);
          const memberMap = new Map(next.get(memberId) ?? []);
          memberMap.delete(category);
          if (memberMap.size === 0) next.delete(memberId);
          else next.set(memberId, memberMap);
          return next;
        });
      }
    },
    [inputDisplay]
  );

  /** Increment/decrement for text-based numeric inputs */
  const handleInputStep = useCallback(
    (memberId: string, category: PolarCategory, direction: 1 | -1) => {
      const current = inputValues.get(memberId)?.get(category) ?? 0;
      const newVal = current + direction;

      const str = String(newVal);
      // Update display
      setInputDisplay((prev) => {
        const next = new Map(prev);
        const memberMap = new Map(next.get(memberId) ?? []);
        memberMap.set(category, str);
        next.set(memberId, memberMap);
        return next;
      });
      // Update parsed value
      setInputValues((prev) => {
        const next = new Map(prev);
        const memberMap = new Map(next.get(memberId) ?? []);
        memberMap.set(category, newVal);
        next.set(memberId, memberMap);
        return next;
      });
    },
    [inputValues]
  );

  const handleSave = useCallback(() => {
    setMessage(null);

    // Build checkbox entries (replace existing for member+date+category)
    const checkboxEntries: {
      memberId: string;
      category: PolarCategory;
      points: number;
    }[] = [];
    const checkboxSet = new Set<string>(CHECKBOX_LANCAMENTO_CATEGORIES);
    for (const [memberId, categories] of checked) {
      for (const category of categories) {
        if (!checkboxSet.has(category)) continue;
        const config = configMap.get(category);
        const points = config?.defaultPoints ?? 0;
        checkboxEntries.push({ memberId, category, points });
      }
    }

    // Build additive entries (OUTROS_PONTOS, appended)
    const additiveEntries: {
      memberId: string;
      category: PolarCategory;
      points: number;
    }[] = [];
    const additiveSet = new Set<string>(ADDITIVE_LANCAMENTO_CATEGORIES);
    for (const [memberId, catMap] of inputValues) {
      for (const [category, points] of catMap) {
        if (points === 0) continue;
        if (!additiveSet.has(category)) continue;
        additiveEntries.push({ memberId, category, points });
      }
    }

    if (
      checkboxEntries.length === 0 &&
      additiveEntries.length === 0 &&
      checked.size === 0
    ) {
      setMessage({
        type: "error",
        text: "Selecione pelo menos um polar para salvar.",
      });
      return;
    }

    startTransition(async () => {
      const result = await savePolares({
        date,
        memberIds: members.map((m) => m.id),
        checkboxEntries: checkboxEntries as Parameters<
          typeof savePolares
        >[0]["checkboxEntries"],
        additiveEntries: additiveEntries as Parameters<
          typeof savePolares
        >[0]["additiveEntries"],
      });
      if (result.success) {
        const total = result.data.checkboxCount + result.data.additiveCount;
        setMessage({
          type: "success",
          text: `${total} polares salvos com sucesso!`,
        });
        // Keep `checked` reflecting persisted state. Clear only the additive
        // input so the user doesn't accidentally re-submit it.
        setInputValues(new Map());
        setInputDisplay(new Map());
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }, [checked, inputValues, configMap, date, members, startTransition]);

  // ---- Atribuição handler ----

  const handleSaveConfigs = useCallback(() => {
    setConfigMessage(null);

    const configs = CONFIGURABLE_CATEGORIES.map((cat) => ({
      category: cat,
      defaultPoints: configValues[cat] ?? 0,
    })) as SavePolarConfigsInput["configs"];

    startConfigTransition(async () => {
      const result = await savePolarConfigs({ configs });
      if (result.success) {
        setConfigMessage({
          type: "success",
          text: `${result.data.count} configurações salvas com sucesso!`,
        });
      } else {
        setConfigMessage({ type: "error", text: result.error });
      }
    });
  }, [configValues, startConfigTransition]);

  // ---- Helpers ----

  function medalLabel(position: number): string {
    if (position === 1) return "1o";
    if (position === 2) return "2o";
    if (position === 3) return "3o";
    return `${position}o`;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="hidden md:block">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Star className="size-7 text-yellow-500" />
          Polares
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie o lançamento e acompanhe o ranking de polares dos sócios.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canLancamento && (
            <TabsTrigger value="lançamento">Lançamento</TabsTrigger>
          )}
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          {canAtribuicao && (
            <TabsTrigger value="atribuição">Atribuição</TabsTrigger>
          )}
        </TabsList>

        {/* ---- Lançamento Tab ---- */}
        {canLancamento && (
          <TabsContent value="lançamento" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lançamento de Polares</CardTitle>
                <CardDescription>
                  Selecione a data e marque os polares conquistados por cada
                  sócio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date picker */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data-lançamento">Data</Label>
                    <DatePicker
                      id="data-lançamento"
                      value={date}
                      onChange={setDate}
                      disabled={isFetching}
                      className="w-[180px]"
                    />
                  </div>
                  {isFetching && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm pb-2">
                      <Loader2 className="size-4 animate-spin" />
                      Carregando...
                    </div>
                  )}
                </div>

                {/* Feedback message */}
                {message && (
                  <div
                    className={`rounded-md px-4 py-2 text-sm ${
                      message.type === "success"
                        ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400"
                        : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* Lançamento Content */}
                {members.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Nenhum sócio ativo encontrado.
                  </p>
                ) : isMobile ? (
                  /* Mobile: Cards */
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {String(member.code).padStart(3, "0")} ·{" "}
                              {member.groupType}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {LANCAMENTO_CATEGORIES.map((cat) => {
                            const isInput = INPUT_CATEGORIES.has(cat);
                            const config = configMap.get(cat);
                            const points = config?.defaultPoints ?? 0;

                            if (isInput) {
                              const upDisabled = isPending;
                              return (
                                <div
                                  key={cat}
                                  className="flex flex-col gap-0.5"
                                >
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {CATEGORY_LABELS[cat]}
                                  </span>
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      className="h-7 text-xs text-center pr-5"
                                      value={getInputValue(member.id, cat)}
                                      onChange={(e) =>
                                        setInputValue(
                                          member.id,
                                          cat,
                                          e.target.value
                                        )
                                      }
                                      onBlur={() =>
                                        handleInputBlur(member.id, cat)
                                      }
                                      disabled={isPending}
                                    />
                                    <div className="absolute right-0 top-0 bottom-0 flex flex-col w-5 border-l">
                                      <button
                                        type="button"
                                        tabIndex={-1}
                                        className="flex-1 flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:pointer-events-none"
                                        disabled={upDisabled}
                                        onClick={() =>
                                          handleInputStep(
                                            member.id,
                                            cat,
                                            1
                                          )
                                        }
                                      >
                                        <ChevronUp className="h-2.5 w-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        tabIndex={-1}
                                        className="flex-1 flex items-center justify-center hover:bg-muted/50 border-t disabled:opacity-30 disabled:pointer-events-none"
                                        disabled={isPending}
                                        onClick={() =>
                                          handleInputStep(
                                            member.id,
                                            cat,
                                            -1
                                          )
                                        }
                                      >
                                        <ChevronDown className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <label
                                key={cat}
                                className="flex items-center gap-1.5 text-xs"
                              >
                                <Checkbox
                                  checked={isChecked(member.id, cat)}
                                  onCheckedChange={() =>
                                    togglePolar(member.id, cat)
                                  }
                                  disabled={isPending}
                                />
                                <span className="truncate">
                                  {CATEGORY_LABELS[cat]}{" "}
                                  <span className="text-muted-foreground">
                                    {points > 0 ? `+${points}` : points} pol
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Desktop: Table */
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Cod</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Grupo</TableHead>
                          {LANCAMENTO_CATEGORIES.map((cat) => {
                            const isInput = INPUT_CATEGORIES.has(cat);
                            const config = configMap.get(cat);
                            const points = config?.defaultPoints ?? 0;
                            return (
                              <TableHead key={cat} className="text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span>{CATEGORY_LABELS[cat]}</span>
                                  {!isInput && (
                                    <span className="text-muted-foreground text-[10px] font-normal">
                                      {points > 0 ? `+${points}` : points} pol
                                    </span>
                                  )}
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {String(member.code).padStart(3, "0")}
                            </TableCell>
                            <TableCell>{member.fullName}</TableCell>
                            <TableCell>{member.groupType}</TableCell>
                            {LANCAMENTO_CATEGORIES.map((cat) => {
                              const isInput = INPUT_CATEGORIES.has(cat);
                              return (
                                <TableCell key={cat} className="text-center">
                                  {isInput ? (
                                    <div className="relative w-20 mx-auto">
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-center h-8 text-xs pr-5"
                                        value={getInputValue(member.id, cat)}
                                        onChange={(e) =>
                                          setInputValue(
                                            member.id,
                                            cat,
                                            e.target.value
                                          )
                                        }
                                        onBlur={() =>
                                          handleInputBlur(member.id, cat)
                                        }
                                        disabled={isPending}
                                      />
                                      <div className="absolute right-0 top-0 bottom-0 flex flex-col w-5 border-l">
                                        <button
                                          type="button"
                                          tabIndex={-1}
                                          className="flex-1 flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:pointer-events-none"
                                          disabled={isPending}
                                          onClick={() =>
                                            handleInputStep(
                                              member.id,
                                              cat,
                                              1
                                            )
                                          }
                                        >
                                          <ChevronUp className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          tabIndex={-1}
                                          className="flex-1 flex items-center justify-center hover:bg-muted/50 border-t disabled:opacity-30 disabled:pointer-events-none"
                                          disabled={isPending}
                                          onClick={() =>
                                            handleInputStep(
                                              member.id,
                                              cat,
                                              -1
                                            )
                                          }
                                        >
                                          <ChevronDown className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={isChecked(member.id, cat)}
                                        onCheckedChange={() =>
                                          togglePolar(member.id, cat)
                                        }
                                        disabled={isPending}
                                      />
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    {isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ---- Ranking Tab ---- */}
        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-yellow-500" />
                Ranking de Polares
              </CardTitle>
              <CardDescription>
                Classificação dos sócios por total de polares acumulados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ranking.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  Nenhum polar registrado ainda.
                </p>
              ) : (
                <>
                  {/* Desktop: Table */}
                  <div className="hidden md:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px] text-center">
                            #
                          </TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Grupo</TableHead>
                          {ALL_CATEGORIES.map((cat) => (
                            <TableHead key={cat} className="text-center">
                              {CATEGORY_LABELS[cat]}
                            </TableHead>
                          ))}
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranking.map((member, idx) => {
                          const position = idx + 1;
                          return (
                            <TableRow
                              key={member.memberId}
                              className={
                                position <= 3
                                  ? "bg-yellow-50/50 dark:bg-yellow-950/10"
                                  : ""
                              }
                            >
                              <TableCell className="text-center font-bold">
                                {position <= 3 ? (
                                  <Badge
                                    variant="secondary"
                                    className={
                                      position === 1
                                        ? "bg-yellow-400 text-yellow-900"
                                        : position === 2
                                          ? "bg-gray-300 text-gray-800"
                                          : "bg-orange-300 text-orange-900"
                                    }
                                  >
                                    {medalLabel(position)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {position}o
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {member.fullName}
                              </TableCell>
                              <TableCell>{member.groupType}</TableCell>
                              {ALL_CATEGORIES.map((cat) => {
                                const value = member.categoryTotals[cat] ?? 0;
                                const isNeg =
                                  NEGATIVE_CATS.has(cat) && value < 0;
                                return (
                                  <TableCell
                                    key={cat}
                                    className={`text-center ${
                                      isNeg ? "text-red-600" : ""
                                    }`}
                                  >
                                    {value}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center font-bold">
                                {member.total}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: Expandable Cards */}
                  <div className="space-y-2 md:hidden">
                    {ranking.map((member, idx) => {
                      const position = idx + 1;
                      const isExpanded = expandedRanking === member.memberId;
                      return (
                        <button
                          type="button"
                          key={member.memberId}
                          className={`w-full text-left rounded-lg border overflow-hidden ${
                            position <= 3
                              ? "bg-yellow-50/50 dark:bg-yellow-950/10"
                              : ""
                          }`}
                          onClick={() =>
                            setExpandedRanking(
                              isExpanded ? null : member.memberId
                            )
                          }
                        >
                          <div className="p-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {position <= 3 ? (
                                  <Badge
                                    variant="secondary"
                                    className={`shrink-0 ${
                                      position === 1
                                        ? "bg-yellow-400 text-yellow-900"
                                        : position === 2
                                          ? "bg-gray-300 text-gray-800"
                                          : "bg-orange-300 text-orange-900"
                                    }`}
                                  >
                                    {medalLabel(position)}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground shrink-0 w-6 text-center">
                                    {position}o
                                  </span>
                                )}
                                <span className="font-medium text-sm truncate">
                                  {member.fullName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-sm">
                                  {member.total} pol
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="size-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="size-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground pl-8">
                              {member.groupType}
                            </p>
                          </div>
                          {isExpanded && (
                            <div className="border-t bg-muted/30 p-3">
                              <div className="grid grid-cols-3 gap-2">
                                {ALL_CATEGORIES.map((cat) => {
                                  const value =
                                    member.categoryTotals[cat] ?? 0;
                                  const isNeg =
                                    NEGATIVE_CATS.has(cat) && value < 0;
                                  return (
                                    <div key={cat} className="text-center">
                                      <p className="text-[10px] text-muted-foreground">
                                        {CATEGORY_LABELS[cat]}
                                      </p>
                                      <p
                                        className={`text-sm font-medium ${
                                          isNeg ? "text-red-600" : ""
                                        }`}
                                      >
                                        {value}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Atribuição Tab ---- */}
        {canAtribuicao && (
          <TabsContent value="atribuição" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="size-5 text-blue-600" />
                  Atribuição de Polares
                </CardTitle>
                <CardDescription>
                  Defina quantos polares cada atividade concede ou desconta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feedback message */}
                {configMessage && (
                  <div
                    className={`rounded-md px-4 py-2 text-sm ${
                      configMessage.type === "success"
                        ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400"
                        : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                    }`}
                  >
                    {configMessage.text}
                  </div>
                )}

                <div className="space-y-2">
                  {CONFIGURABLE_CATEGORIES.map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <p className="font-medium text-sm">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-24 text-center"
                          value={configValues[cat] ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setConfigValues((prev) => ({
                              ...prev,
                              [cat]: isNaN(val) ? 0 : val,
                            }));
                          }}
                          disabled={isPendingConfigs}
                        />
                        <span className="text-xs text-muted-foreground w-6">
                          pol
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveConfigs}
                    disabled={isPendingConfigs}
                  >
                    {isPendingConfigs ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    {isPendingConfigs
                      ? "Salvando..."
                      : "Salvar Configurações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
