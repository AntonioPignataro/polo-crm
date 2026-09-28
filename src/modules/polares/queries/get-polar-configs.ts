"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { POLAR_DEFAULTS } from "@/lib/constants";
import type { PolarCategory } from "@/types";

export interface PolarConfigItem {
  category: PolarCategory;
  defaultPoints: number;
  description: string | null;
}

/**
 * Fetches PolarConfig records for the authenticated user's club.
 * Falls back to POLAR_DEFAULTS for categories that don't have a config row.
 */
export async function getPolarConfigs(): Promise<PolarConfigItem[]> {
  const session = await getRequiredSession();

  const configs = await prisma.polarConfig.findMany({
    where: { clubId: session.clubId },
    select: {
      category: true,
      defaultPoints: true,
      description: true,
    },
    orderBy: { category: "asc" },
  });

  // Build a map from DB configs
  const configMap = new Map<PolarCategory, PolarConfigItem>(
    configs.map((c) => [
      c.category,
      {
        category: c.category,
        defaultPoints: c.defaultPoints,
        description: c.description,
      },
    ])
  );

  // Ensure all categories are represented, falling back to POLAR_DEFAULTS
  const allCategories = Object.keys(POLAR_DEFAULTS) as PolarCategory[];
  return allCategories.map((category) => {
    const existing = configMap.get(category);
    if (existing) return existing;
    return {
      category,
      defaultPoints: POLAR_DEFAULTS[category].points,
      description: POLAR_DEFAULTS[category].label,
    };
  });
}
