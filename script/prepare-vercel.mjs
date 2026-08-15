import { readFile, writeFile } from "node:fs/promises";

const files = ["server/routes.ts", "server/storage.ts"];

for (const file of files) {
  let source = await readFile(file, "utf8");
  const before = source;

  // Vercel's Node runtime does not resolve the TypeScript @shared/* path alias.
  // Rewrite only the server-side imports during the Vercel build so local/Replit
  // development can keep using the existing tsconfig path aliases.
  source = source
    .replace(/from\s+["']@shared\/schema["']/g, 'from "../shared/schema"')
    .replace(/from\s+["']@shared\/routes["']/g, 'from "../shared/routes"')
    .replace(/import\s+createMemoryStore\s+from\s+["']memorystore["'];/, 'import createSessionStore from "./session-store";')
    .replace(/const\s+MemoryStore\s*=\s*createMemoryStore\(session\);/, 'const SessionStore = createSessionStore(session);')
    .replace(/const\s+OWNER_KEY\s*=\s*["'][^"']*["'];/, 'const OWNER_KEY = process.env.OWNER_KEY;')
    .replace(/store:\s*new\s+MemoryStore\([\s\S]*?\),/m, 'store: new SessionStore(),')
    .replace(/cookie:\s*\{\s*maxAge:\s*86400000\s*\},/, 'cookie: { maxAge: 86400000, httpOnly: true, secure: true, sameSite: "lax" },')
    .replace(/secret:\s*process\.env\.SESSION_SECRET\s*\|\|\s*["'][^"']*["'],/, 'secret: process.env.SESSION_SECRET!,');

  if (source === before) {
    throw new Error(`Vercel preparation made no changes to ${file}; expected Vercel-incompatible server imports or session setup.`);
  }

  await writeFile(file, source);
}

console.log("Prepared server sources for Vercel: relative shared imports, PostgreSQL sessions, and production secrets.");
