/**
 * Supabase + Prisma helpers.
 * @see https://supabase.com/docs/guides/database/prisma
 */

function isSupabaseTransactionPooler(host: string, port: string): boolean {
  return host.includes("pooler.supabase.com") && port === "6543";
}

/**
 * Supabase pooler URLs use user `postgres.<project-ref>`. The direct host is
 * `db.<project-ref>.supabase.co:5432` with user `postgres` and the same password.
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres
 */
function deriveSupabaseDirectUrlFromPooler(poolerUrl: string): string | null {
  try {
    const u = new URL(poolerUrl);
    if (!isSupabaseTransactionPooler(u.hostname, u.port)) return null;

    const user = decodeURIComponent(u.username);
    const refMatch = /^postgres\.(.+)$/i.exec(user);
    if (!refMatch) return null;
    const ref = refMatch[1];

    const direct = new URL(poolerUrl);
    direct.hostname = `db.${ref}.supabase.co`;
    direct.port = "5432";
    // Direct session to Postgres uses role `postgres`, not `postgres.<ref>` (pooler style).
    direct.username = "postgres";
    direct.searchParams.delete("pgbouncer");
    direct.searchParams.delete("uselibpqcompat");
    if (!direct.searchParams.has("sslmode")) {
      direct.searchParams.set("sslmode", "require");
    }
    return direct.toString();
  } catch {
    return null;
  }
}

/**
 * For the app runtime (Pg adapter): transaction pooler must use `pgbouncer=true`
 * so Prisma does not use named prepared statements that break on PgBouncer.
 */
export function ensurePgbouncerParamForPooler(url: string): string {
  try {
    const u = new URL(url);
    if (isSupabaseTransactionPooler(u.hostname, u.port) && !u.searchParams.has("pgbouncer")) {
      u.searchParams.set("pgbouncer", "true");
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * URL for Prisma CLI (`migrate`, `db push`, introspection).
 *
 * 1. `DIRECT_URL` when set (explicit direct / session connection).
 * 2. Else, if `DATABASE_URL` is a Supabase **transaction** pooler (`…pooler…:6543`) with user
 *    `postgres.<ref>`, derive the matching `db.<ref>.supabase.co:5432` URL (same as dashboard “Direct”).
 * 3. Else return `DATABASE_URL` (optionally adding `pgbouncer=true` for other poolers).
 */
export function prismaCliDatabaseUrl(): string {
  const explicitDirect = process.env.DIRECT_URL?.trim();
  if (explicitDirect) return explicitDirect;

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_URL is required. For Supabase, use the pooler URI in DATABASE_URL and optionally set DIRECT_URL to the direct host (port 5432) from Project Settings → Database."
    );
  }

  const derived = deriveSupabaseDirectUrlFromPooler(raw);
  if (derived) return derived;

  try {
    const u = new URL(raw);
    if (isSupabaseTransactionPooler(u.hostname, u.port)) {
      if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
      if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
    }
    return u.toString();
  } catch {
    return raw;
  }
}
