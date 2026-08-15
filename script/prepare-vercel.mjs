import { readFile, writeFile } from "node:fs/promises";

const replacements = [
  ["server/routes.ts", [
    [
      'import { users, accessKeys, searchHistory, messages, groupChats, groupChatMembers, customEmojis, friendRequests, blocks } from "@shared/schema";',
      'import { users, accessKeys, searchHistory, messages, groupChats, groupChatMembers, customEmojis, friendRequests, blocks } from "../shared/schema";',
    ],
    ['import { api } from "@shared/routes";', 'import { api } from "../shared/routes";'],
    ['import createMemoryStore from "memorystore";', 'import createSessionStore from "./session-store";'],
    ['const MemoryStore = createMemoryStore(session);', 'const SessionStore = createSessionStore(session);'],
    ['const OWNER_KEY = "adammalik1234674";', 'const OWNER_KEY = process.env.OWNER_KEY;'],
    [
      'store: new MemoryStore({\n        checkPeriod: 86400000,\n      }),',
      'store: new SessionStore(),',
    ],
    [
      'cookie: { maxAge: 86400000 },',
      'cookie: { maxAge: 86400000, httpOnly: true, secure: true, sameSite: "lax" },',
    ],
    ['secret: process.env.SESSION_SECRET || "super secret hacker key",', 'secret: process.env.SESSION_SECRET!,'],
  ]],
  ["server/storage.ts", [
    [
      'import { users, accessKeys, searchHistory, messages, groupChats, groupChatMembers, shopItems, userInventory, accessRequests, customEmojis,\n  type User, type AccessKey, type HistoryItem, type Message,\n  type CreateKeyRequest, type CreateHistoryRequest, type CreateMessageRequest\n} from "@shared/schema";',
      'import { users, accessKeys, searchHistory, messages, groupChats, groupChatMembers, shopItems, userInventory, accessRequests, customEmojis,\n  type User, type AccessKey, type HistoryItem, type Message,\n  type CreateKeyRequest, type CreateHistoryRequest, type CreateMessageRequest\n} from "../shared/schema";',
    ],
  ]],
];

for (const [file, fileReplacements] of replacements) {
  let source = await readFile(file, "utf8");

  for (const [from, to] of fileReplacements) {
    if (!source.includes(from)) {
      throw new Error(`Vercel preparation could not find expected text in ${file}: ${from}`);
    }
    source = source.replace(from, to);
  }

  await writeFile(file, source);
}

console.log("Prepared server sources for Vercel: relative shared imports, PostgreSQL sessions, and production secrets.");
