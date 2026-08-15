import { readFile, writeFile } from "node:fs/promises";

const files = [
  "server/routes.ts",
  "server/storage.ts",
  "shared/routes.ts",
];

for (const file of files) {
  const source = await readFile(file, "utf8");

  // Vercel's Node runtime executes the generated function as native ESM.
  // TypeScript path aliases and extensionless relative imports are not
  // runtime-resolvable there, so the emitted server graph uses real .js paths.
  const prepared = source
    .replace(/from\s+["']@shared\/schema["']/g, 'from "../shared/schema.js"')
    .replace(/from\s+["']@shared\/routes["']/g, 'from "../shared/routes.js"')
    .replace(/from\s+["']\.\/schema["']/g, 'from "./schema.js"')
    .replace(/from\s+["']\.\/db["']/g, 'from "./db.js"')
    .replace(/from\s+["']\.\/storage["']/g, 'from "./storage.js"')
    .replace(/from\s+["']\.\/routes["']/g, 'from "./routes.js"')
    .replace(/from\s+["']\.\/session-store["']/g, 'from "./session-store.js"')
    .replace(/import\s+createMemoryStore\s+from\s+["']memorystore["'];/g, 'import createSessionStore from "./session-store.js";')
    .replace(/const\s+MemoryStore\s*=\s*createMemoryStore\(session\);/g, 'const SessionStore = createSessionStore(session);')
    .replace(/const\s+OWNER_KEY\s*=\s*["'][^"']*["'];/g, 'const OWNER_KEY = process.env.OWNER_KEY;')
    .replace(/store:\s*new\s+MemoryStore\([\s\S]*?\),/m, 'store: new SessionStore(),')
    .replace(/cookie:\s*\{\s*maxAge:\s*86400000\s*\},/g, 'cookie: { maxAge: 86400000, httpOnly: true, secure: true, sameSite: "lax" },')
    .replace(/secret:\s*process\.env\.SESSION_SECRET\s*\|\|\s*["'][^"']*["'],/g, 'secret: process.env.SESSION_SECRET!,');

  if (prepared !== source) {
    await writeFile(file, prepared);
    console.log(`Prepared ${file} for Vercel.`);
  } else {
    console.log(`${file} is already Vercel-safe.`);
  }
}

console.log("Vercel server preparation complete.");
