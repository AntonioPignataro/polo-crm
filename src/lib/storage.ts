/**
 * Minimal server-side Supabase Storage client for the "documentos" bucket.
 * Uses the service_role key (bypasses RLS) — access control is enforced by the
 * calling server actions (the app authenticates with NextAuth, not Supabase
 * Auth). The project ref is derived from DATABASE_URL so this targets dev
 * locally and prod on Vercel automatically.
 */
const BUCKET = "documentos";

function projectUrl(): string {
  const ref = (process.env.DATABASE_URL ?? "").match(/postgres\.([a-z0-9]+)/)?.[1];
  if (!ref) {
    throw new Error("Não foi possível derivar o projeto Supabase do DATABASE_URL.");
  }
  return `https://${ref}.supabase.co`;
}

function storageBase(): string {
  return `${projectUrl()}/storage/v1`;
}

function authHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  return { Authorization: `Bearer ${key}`, apikey: key };
}

/** Upload (or overwrite) a file at `path` within the documentos bucket. */
export async function uploadToStorage(
  path: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<void> {
  const res = await fetch(`${storageBase()}/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": contentType || "application/octet-stream",
      "x-upsert": "true",
    },
    body: body as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`Falha ao enviar arquivo (${res.status}): ${await res.text()}`);
  }
}

/** Delete a file at `path`. A missing file (404) is treated as success. */
export async function deleteFromStorage(path: string): Promise<void> {
  const res = await fetch(`${storageBase()}/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Falha ao excluir arquivo (${res.status}): ${await res.text()}`);
  }
}

/** Create a short-lived signed download URL for `path`. */
export async function signedDownloadUrl(
  path: string,
  expiresInSeconds = 120
): Promise<string> {
  const res = await fetch(`${storageBase()}/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao gerar link (${res.status}): ${await res.text()}`);
  }
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${storageBase()}${signedURL}`;
}
