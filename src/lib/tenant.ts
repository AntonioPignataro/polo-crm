/**
 * Tenant resolution helpers. Pure functions — Edge-runtime safe.
 * Do NOT import Prisma here. DB lookups happen in server actions / route handlers.
 */

const APEX_DOMAIN = "sistemapolo.com";

const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

/**
 * Extract a tenant slug from a Host header.
 * Returns the slug for `<slug>.sistemapolo.com`, otherwise null.
 * Rejects "www", multi-level subdomains, and the bare apex.
 */
export function extractTenantSlug(
  host: string | null | undefined
): string | null {
  if (!host) return null;
  const cleanHost = host.split(":")[0].toLowerCase();

  if (cleanHost.endsWith("." + APEX_DOMAIN)) {
    const slug = cleanHost.slice(0, -(APEX_DOMAIN.length + 1));
    if (slug && !slug.includes(".") && slug !== "www") return slug;
  }
  return null;
}

/** Is this exactly `sistemapolo.com` (no subdomain)? */
export function isProductionApex(host: string | null | undefined): boolean {
  if (!host) return false;
  return host.split(":")[0].toLowerCase() === APEX_DOMAIN;
}

/** localhost / 127.0.0.1 / *.vercel.app — environments where we fall back. */
export function isNonProductionHost(
  host: string | null | undefined
): boolean {
  if (!host) return false;
  const cleanHost = host.split(":")[0].toLowerCase();
  if (DEV_HOSTS.has(cleanHost)) return true;
  if (cleanHost.endsWith(".vercel.app")) return true;
  return false;
}

export { APEX_DOMAIN };
