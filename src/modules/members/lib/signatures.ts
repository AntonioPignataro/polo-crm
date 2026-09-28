import type { ParentRelationship, Sex } from "@/types";

/**
 * Per-parent e-signature model.
 *
 * A child's enrollment authorization requires a signature from EACH of its
 * registered parents/guardians who can log in (Parent.userId set). Signatures
 * are stored in Member.enrollmentFormUrl as JSON, keyed by Parent.id:
 *
 *   { "signatures": { "<parentId>": { signature, signerName, ... } } }
 *
 * Legacy rows written by the old single-signature flow have a flat top-level
 * `signature` and no `signatures` map; they carry no parent attribution, so
 * they parse to an empty map and those children are re-signed under this model.
 */

/** One parent/guardian's e-signature entry. */
export interface ParentSignatureEntry {
  signature: string; // data-URL PNG
  signerName: string;
  signerCpf: string;
  signerRelationship: string;
  signedAt: string; // ISO timestamp
  signedByUserId?: string;
}

/** A required signer (an account-linked parent) + whether they have signed. */
export interface SignerInfo {
  parentId: string;
  fullName: string;
  relationship: ParentRelationship;
  sex: Sex | null;
  hasSigned: boolean;
}

/** Aggregate completion for a child. */
export interface SignatureStatus {
  /** Number of account-linked parents who must sign. */
  required: number;
  /** How many of them have signed. */
  signed: number;
  /** True only when there is at least one required signer and all have signed. */
  fullySigned: boolean;
}

/** A parent as needed to compute signers (subset of the Parent model). */
export interface ParentForSigning {
  id: string;
  fullName: string;
  relationship: ParentRelationship;
  sex: Sex | null;
  userId: string | null;
}

/**
 * Parse Member.enrollmentFormUrl into the per-parent signature map.
 * Returns {} for null/invalid JSON or legacy flat rows.
 */
export function parseSignatures(
  enrollmentFormUrl: string | null | undefined
): Record<string, ParentSignatureEntry> {
  if (!enrollmentFormUrl) return {};
  try {
    const data = JSON.parse(enrollmentFormUrl) as {
      signatures?: Record<string, ParentSignatureEntry>;
    };
    if (data && typeof data === "object" && data.signatures && typeof data.signatures === "object") {
      return data.signatures;
    }
  } catch {
    // invalid JSON — treated as no signatures
  }
  return {};
}

/**
 * The required signers for a child: its parents/guardians that have a login
 * account (userId set), each annotated with whether they have already signed.
 */
export function buildSigners(
  parents: ParentForSigning[],
  signatures: Record<string, ParentSignatureEntry>
): SignerInfo[] {
  return parents
    .filter((p) => p.userId != null)
    .map((p) => ({
      parentId: p.id,
      fullName: p.fullName,
      relationship: p.relationship,
      sex: p.sex,
      hasSigned: !!signatures[p.id],
    }));
}

/** Completion status derived from a signer list. */
export function statusFromSigners(signers: SignerInfo[]): SignatureStatus {
  const required = signers.length;
  const signed = signers.filter((s) => s.hasSigned).length;
  return { required, signed, fullySigned: required > 0 && signed === required };
}
