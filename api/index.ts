import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";
import { createRequire } from "node:module";

type AppModule = {
  app: Express;
  initializeApp: () => Promise<void>;
};

const require = createRequire(import.meta.url);
const serverApp = require("../dist/vercel/server/app.js") as AppModule;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    await serverApp.initializeApp();
    return serverApp.app(req, res);
  } catch (error) {
    console.error("API initialization failed:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "API initialization failed",
      });
    }
  }
}
