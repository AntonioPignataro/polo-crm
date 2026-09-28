"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession, requireMonitor } from "@/lib/auth-utils";

export interface DocumentoItem {
  id: string;
  name: string;
  sizeBytes: number | null;
  mimeType: string | null;
  visibility: "MONITOR" | "ALL";
  uploaderName: string | null;
  createdAt: string;
}

const MONITOR_PLUS = ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"];

type FileRow = {
  id: string;
  name: string;
  sizeBytes: number | null;
  mimeType: string | null;
  visibility: string;
  uploaderName: string | null;
  createdAt: Date;
};

const select = {
  id: true,
  name: true,
  sizeBytes: true,
  mimeType: true,
  visibility: true,
  uploaderName: true,
  createdAt: true,
} as const;

function toItem(f: FileRow): DocumentoItem {
  return {
    id: f.id,
    name: f.name,
    sizeBytes: f.sizeBytes,
    mimeType: f.mimeType,
    visibility: f.visibility === "ALL" ? "ALL" : "MONITOR",
    uploaderName: f.uploaderName,
    createdAt: f.createdAt.toISOString(),
  };
}

/** Every file in the club — for the Relatórios file manager (MONITOR+). */
export async function listManagedFiles(): Promise<DocumentoItem[]> {
  const session = await requireMonitor();
  const files = await prisma.reportFile.findMany({
    where: { clubId: session.clubId },
    orderBy: { createdAt: "desc" },
    select,
  });
  return files.map(toItem);
}

/** Files the current user may view — for the /documentos screen. Parents only
 *  see files marked visible to everyone; monitor+ see all of them. */
export async function listVisibleDocuments(): Promise<DocumentoItem[]> {
  const session = await getRequiredSession();
  const isMonitor = MONITOR_PLUS.includes(session.role);
  const files = await prisma.reportFile.findMany({
    where: {
      clubId: session.clubId,
      ...(isMonitor ? {} : { visibility: "ALL" as const }),
    },
    orderBy: { createdAt: "desc" },
    select,
  });
  return files.map(toItem);
}
