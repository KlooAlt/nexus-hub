import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db.js";

const PgStore = connectPgSimple(session);

/**
 * Compatibility shim for the existing registerRoutes() call site.
 * It preserves the existing createMemoryStore(session) API while using
 * PostgreSQL so sessions survive Vercel instance changes.
 */
export default function createSessionStore(_session: typeof session) {
  return class SharedPgSessionStore extends PgStore {
    constructor(options: ConstructorParameters<typeof PgStore>[0] = {}) {
      super({
        ...options,
        pool,
        tableName: options.tableName ?? "session",
        createTableIfMissing: true,
      });
    }
  };
}
