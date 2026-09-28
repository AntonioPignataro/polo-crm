import type { Prisma } from "@/generated/prisma/client";

export interface MembershipDates {
  enrollmentDate: Date | null;
  inactivatedAt: Date | null;
}

/**
 * Prisma where-fragment for members whose membership overlaps `[start, end]` —
 * i.e. who were an active member at some point DURING the period, regardless of
 * their status right now. Use this in period reports instead of
 * `status: "ATIVO"`, so a member who joined after the period is excluded and one
 * who has since left (but was active in the period) is still included.
 *
 * A null enrollmentDate is treated as "joined at the beginning of time" and a
 * null inactivatedAt as "still active".
 */
export function activeInPeriodWhere(
  start: Date,
  end: Date
): Prisma.MemberWhereInput {
  return {
    AND: [
      { OR: [{ enrollmentDate: null }, { enrollmentDate: { lte: end } }] },
      { OR: [{ inactivatedAt: null }, { inactivatedAt: { gte: start } }] },
    ],
  };
}

/**
 * Whether the member was an active member for any part of the given month
 * (`month` is 0-indexed). Drives the monthly-matrix reports' distinction between
 * "n/a" (not yet / no longer a member that month) and "0" (a member, but absent).
 */
export function wasActiveInMonth(
  m: MembershipDates,
  year: number,
  month: number
): boolean {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  if (m.enrollmentDate && m.enrollmentDate > lastOfMonth) return false; // joined after this month
  if (m.inactivatedAt && m.inactivatedAt < firstOfMonth) return false; // left before this month
  return true;
}
