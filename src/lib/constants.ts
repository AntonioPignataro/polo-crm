import type { PolarCategory, ModuleType } from "@/types";

export const POLAR_DEFAULTS: Record<PolarCategory, { points: number; label: string }> = {
  PRESENCA: { points: 30, label: "Presença" },
  PONTUALIDADE: { points: 20, label: "Pontualidade" },
  AMIGO: { points: 20, label: "Amigo" },
  ESPORTE: { points: 20, label: "Esporte" },
  ENCARGO: { points: 20, label: "Encargo" },
  MULTA: { points: -20, label: "Multa" },
  EXERCICIO: { points: 60, label: "Exercício" },
  BOLETIM: { points: 100, label: "Boletim" },
  RESUMO: { points: 30, label: "Resumo" },
  OUTROS_PONTOS: { points: 0, label: "Outros pontos" },
  LIVRO: { points: 60, label: "Livro" },
};

export const MODULE_LABELS: Record<ModuleType, string> = {
  QUINTA: "Quinta-feira",
  SEXTA: "Sexta-feira",
  SABADO: "Sábado",
};

export const GROUP_LABELS = {
  G1: "G1",
  G2: "G2",
  G3: "G3",
} as const;

export const MEMBER_STATUS_LABELS = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
} as const;

export const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  DIRETOR: "Diretor",
  PRECEPTOR: "Preceptor",
  MONITOR: "Monitor",
  USUARIO: "Usuário",
} as const;

export const APPOINTMENT_TYPE_LABELS = {
  SACERDOTE: "Sacerdote",
  PRECEPTORIA_SOCIO: "Preceptoria Sócio",
  PRECEPTORIA_PAIS: "Preceptoria Pais",
} as const;

export const ACTIVITY_STATUS_LABELS = {
  PLANEJADA: "Planejada",
  INSCRICOES_ABERTAS: "Inscrições Abertas",
  INSCRICOES_ENCERRADAS: "Inscrições Encerradas",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
} as const;

export const CALENDAR_EVENT_TYPE_LABELS = {
  CLUBE_REGULAR: "Clube regular",
  ATIVIDADE_EXTERNA: "Atividade externa",
  FORMACAO_PAIS: "Formação de Pais",
  SEM_ATIVIDADE: "Sem atividade",
  OUTROS: "Outros",
} as const;

export const FORMATION_TYPE_LABELS = {
  FORMACAO_PAI: "Formação pai",
  FORMACAO_CASAL: "Formação casal",
} as const;

export const BOOK_CATEGORY_LABELS = {
  LITERATURA: "Literatura",
  LEITURA_ESPIRITUAL: "Leitura espiritual",
  FORMACAO_HUMANA: "Formação humana",
} as const;

export const NOTIFICATION_TYPE_LABELS = {
  ALERTA_PRESENCA: "Alerta de Presença",
  ALERTA_PRECEPTORIA: "Alerta de Preceptoria",
  ALERTA_FORMACAO_PAIS: "Alerta de Formação de Pais",
  LEMBRETE_ATIVIDADE: "Lembrete de Atividade",
  GERAL: "Geral",
  ANIVERSARIO: "Aniversário",
  ALTERACAO_CALENDARIO: "Alteração de Calendário",
} as const;

export const NOTIFICATION_CHANNEL_LABELS = {
  EMAIL: "E-mail",
} as const;

/**
 * Prisma `where` filter to exclude members from polares/study-hours.
 *
 * Rules:
 * - G1: always included
 * - G2: included only if `polaresUntil` is set and >= now (opt-in)
 * - G3: always excluded
 *
 * Usage: `where: { ...excludeFromPolaresFilter(), clubId }` or
 *        `where: { member: excludeFromPolaresFilter() }`
 */
export function excludeFromPolaresFilter() {
  const now = new Date();
  return {
    OR: [
      { groupType: "G1" as const },
      { groupType: "G2" as const, polaresUntil: { gte: now } },
    ],
  };
}

/** @deprecated Use `excludeFromPolaresFilter()` instead. */
export const excludeG3Filter = excludeFromPolaresFilter;

/**
 * Check if a single member should be excluded from polares.
 * Returns true if the member IS excluded.
 *
 * - G1: never excluded
 * - G2: excluded unless valid `polaresUntil` >= now
 * - G3: always excluded
 */
export function isExcludedFromPolares(
  groupType: string,
  polaresUntil: Date | null | undefined
): boolean {
  if (groupType === "G1") return false;
  if (groupType === "G3") return true;
  // G2: opt-in via polaresUntil
  if (!polaresUntil) return true;
  return new Date(polaresUntil) < new Date();
}

export const BIMESTER_RANGES = [
  { label: "Mar/Abr", startMonth: 3, endMonth: 4 },
  { label: "Mai/Jun", startMonth: 5, endMonth: 6 },
  { label: "Ago/Set", startMonth: 8, endMonth: 9 },
  { label: "Out/Nov", startMonth: 10, endMonth: 11 },
] as const;
