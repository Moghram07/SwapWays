import { Client } from "pg";
import { randomUUID } from "node:crypto";

function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function resolvePgConnectionString(rawUrl) {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) return rawUrl;
  if (!rawUrl.startsWith("prisma+postgres://")) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    const apiKey = parsed.searchParams.get("api_key");
    if (!apiKey) return rawUrl;
    const parts = apiKey.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(decodeBase64Url(parts[1]));
      return payload.databaseUrl || rawUrl;
    }

    // Some local prisma+postgres URLs use a plain base64-encoded JSON api_key payload.
    const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"));
    return decoded.databaseUrl || rawUrl;
  } catch {
    return rawUrl;
  }
}

const databaseUrl = resolvePgConnectionString(process.env.DATABASE_URL);
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

const FAMILIES = [
  { code: "A320", name: "Airbus A320", scheduleCode: "A320" },
  { code: "A321", name: "Airbus A321", scheduleCode: "A321" },
  { code: "A330", name: "Airbus A330", scheduleCode: "A330" },
  { code: "B777", name: "Boeing B777", scheduleCode: "B777" },
  { code: "B787", name: "Boeing B787", scheduleCode: "B787" },
];

function toFamily(code) {
  const c = String(code ?? "").toUpperCase();
  if (!c) return null;
  if (c === "323" || c.startsWith("A321")) return "A321";
  if (c.startsWith("32") || c.startsWith("A320")) return "A320";
  if (c.startsWith("33") || c.startsWith("A330")) return "A330";
  if (c.startsWith("77") || c.startsWith("B777")) return "B777";
  if (c.startsWith("78") || c.startsWith("B787")) return "B787";
  return null;
}

async function run() {
  await client.connect();
  await client.query("BEGIN");

  try {
    const airlineRes = await client.query(
      `SELECT id FROM "Airline" WHERE code = 'SV' LIMIT 1`
    );
    if (airlineRes.rowCount === 0) {
      throw new Error("Saudia airline (code SV) not found.");
    }
    const airlineId = airlineRes.rows[0].id;

    const familyIdByCode = new Map();
    for (const family of FAMILIES) {
      const upsertRes = await client.query(
        `INSERT INTO "AircraftType" ("id","name","code","scheduleCode","airlineId")
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT ("airlineId","code")
         DO UPDATE SET "name" = EXCLUDED."name", "scheduleCode" = EXCLUDED."scheduleCode"
         RETURNING id`,
        [randomUUID(), family.name, family.code, family.scheduleCode, airlineId]
      );
      familyIdByCode.set(family.code, upsertRes.rows[0].id);
    }

    const aircraftRes = await client.query(
      `SELECT id, code, "scheduleCode" FROM "AircraftType" WHERE "airlineId" = $1`,
      [airlineId]
    );

    const familyCodes = new Set(FAMILIES.map((f) => f.code));
    const oldVariants = aircraftRes.rows
      .map((row) => {
        const family =
          toFamily(row.code) || toFamily(row.scheduleCode);
        return { id: row.id, code: row.code, family };
      })
      .filter((row) => row.family && !familyCodes.has(String(row.code).toUpperCase()));

    let migratedQualifications = 0;
    let deletedOldQualifications = 0;
    let deletedOldAircraft = 0;

    for (const row of oldVariants) {
      const targetAircraftId = familyIdByCode.get(row.family);
      if (!targetAircraftId) continue;

      const migrateRes = await client.query(
        `INSERT INTO "UserQualification" ("id","userId","aircraftTypeId")
         SELECT $1 || '-' || uq."userId", uq."userId", $2
         FROM "UserQualification" uq
         WHERE uq."aircraftTypeId" = $3
         ON CONFLICT ("userId","aircraftTypeId") DO NOTHING`,
        [randomUUID(), targetAircraftId, row.id]
      );
      migratedQualifications += migrateRes.rowCount;

      const deleteQualRes = await client.query(
        `DELETE FROM "UserQualification" WHERE "aircraftTypeId" = $1`,
        [row.id]
      );
      deletedOldQualifications += deleteQualRes.rowCount;

      const deleteAircraftRes = await client.query(
        `DELETE FROM "AircraftType" WHERE id = $1`,
        [row.id]
      );
      deletedOldAircraft += deleteAircraftRes.rowCount;
    }

    await client.query("COMMIT");

    console.log("Saudia fleet cleanup complete.");
    console.log(`- Family rows ensured: ${FAMILIES.length}`);
    console.log(`- Old variant rows removed: ${deletedOldAircraft}`);
    console.log(`- Qualifications migrated: ${migratedQualifications}`);
    console.log(`- Old qualifications removed: ${deletedOldQualifications}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
