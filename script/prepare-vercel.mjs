import { readFile, writeFile } from "node:fs/promises";

const files = ["server/routes.ts", "server/storage.ts"];

for (const file of files) {
  let source = await readFile(file, "utf8");

  // Vercel's Node runtime does not resolve the TypeScript @shared/* path alias.
  // Rewrite server-side imports during the Vercel build. These replacements are
  // intentionally idempotent so a source file that is already Vercel-safe does
  // not make the build fail.
  const prepared = source
    .replace(/from\s+["']@shared\/schema["']/g, 'from "../shared/schema"')
    .replace(/from\s+["']@shared\/routes["']/g, 'from "../shared/routes"')
    .replace(/import\s+createMemoryStore\s+from\s+["']memorystore["'];/g, 'import createSessionStore from "./session-store";')
    .replace(/const\s+MemoryStore\s*=\s*createMemoryStore\(session\);/g, 'const SessionStore = createSessionStore(session);')
    .replace(/const\s+OWNER_KEY\s*=\s*["'][^"']*["'];/g, 'const OWNER_KEY = process.env.OWNER_KEY;')
    .replace(/store:\s*new\s+MemoryStore\([\s\S]*?\),/m, 'store: new SessionStore(),')
    .replace(/cookie:\s*\{\s*maxAge:\s*86400000\s*\},/g, 'cookie: { maxAge: 86400000, httpOnly: true, secure: true, sameSite: "lax" },')
    .replace(/secret:\s*process\.env\.SESSION_SECRET\s*\|\|\s*["'][^"']*["'],/g, 'secret: process.env.SESSION_SECRET!,');

  if (prepared !== source) {
    await writeFile(file, prepared);
    console.log(`Prepared ${file} for Vercel.`);
  } else {
    console.log(`${file} is already Vercel-safe; no preparation changes needed.`);
  }
}

console.log("Vercel server preparation complete.");
