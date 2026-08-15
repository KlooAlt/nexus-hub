import { readFile, writeFile } from "node:fs/promises";

const files = [
  "api/index.ts",
  "server/app.ts",
  "server/routes.ts",
  "server/storage.ts",
  "server/db.ts",
  "server/session-store.ts",
];

for (const file of files) {
  let source = await readFile(file, "utf8");

  // Vercel's Node runtime uses native ESM resolution for the generated function.
  // Keep the serverless dependency graph explicit with .ts specifiers so Vercel
  // traces and bundles the local TypeScript modules instead of leaving imports
  // such as /var/task/server/app unresolved at runtime.
  const prepared = source
    .replace(/from\s+["']@shared\/schema["']/g, 'from "../shared/schema.ts"')
    .replace(/from\s+["']@shared\/routes["']/g, 'from "../shared/routes.ts"')
    .replace(/from\s+["']\.\/db["']/g, 'from "./db.ts"')
    .replace(/from\s+["']\.\/storage["']/g, 'from "./storage.ts"')
    .replace(/from\s+["']\.\/routes["']/g, 'from "./routes.ts"')
    .replace(/from\s+["']\.\/session-store["']/g, 'from "./session-store.ts"')
    .replace(/from\s+["']\.\.\/server\/app["']/g, 'from "../server/app.ts"')
    .replace(/import\s+createMemoryStore\s+from\s+["']memorystore["'];/g, 'import createSessionStore from "./session-store.ts";')
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
