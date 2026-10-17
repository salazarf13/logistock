import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let kind = "pglite";
let pool = null;
let lite = null;

export async function query(text, params = []) {
  if (kind === "pg") {
    const result = await pool.query(text, params);
    return result.rows;
  }
  const result = await lite.query(text, params);
  return result.rows;
}

export async function withTransaction(fn) {
  if (kind === "pg") {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const q = async (text, params = []) => (await client.query(text, params)).rows;
      const out = await fn(q);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  return lite.transaction(async (tx) => {
    const q = async (text, params = []) => (await tx.query(text, params)).rows;
    return fn(q);
  });
}

export async function initDb() {
  if (process.env.DATABASE_URL) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2500,
    });
    try {
      await pool.query("SELECT 1");
      kind = "pg";
      await pool.query("CREATE EXTENSION IF NOT EXISTS postgis").catch(() => {});
      console.log("Base de datos: PostgreSQL");
    } catch {
      await pool.end().catch(() => {});
      pool = null;
      kind = "pglite";
    }
  }

  if (kind === "pglite") {
    const dataDir = path.join(__dirname, "../data");
    fs.mkdirSync(dataDir, { recursive: true });
    lite = new PGlite(dataDir);
    await lite.waitReady;
    console.log("Base de datos: PGlite (Postgres embebido). Instala Docker para usar PostgreSQL real.");
  }

  const schemaPath = path.join(__dirname, "../../database/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await query(stmt);
  }
  await query(
    "ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS stock_descontado BOOLEAN NOT NULL DEFAULT FALSE"
  ).catch(() => {});
}

export async function closeDb() {
  if (pool) await pool.end();
  if (lite) await lite.close();
}
