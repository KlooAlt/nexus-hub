import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before the API can start.");
}

declare global {
  // eslint-disable-next-line no-var
  var __nexusHubPgPool: pg.Pool | undefined;
}

export const pool =
  globalThis.__nexusHubPgPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

globalThis.__nexusHubPgPool = pool;

export const db = drizzle(pool, { schema });
