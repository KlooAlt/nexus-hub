import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";
import path from "node:path";
import { pathToFileURL } from "node:url";

type AppModule = {
  app: Express;
  initializeApp: () => Promise<void>;
};

let appModulePromise: Promise<AppModule> | undefined;

function loadServerApp(): Promise<AppModule> {
  if (!appModulePromise) {
    const modulePath = pathToFileURL(
      path.join(process.cwd(), "dist", "vercel", "server", "app.js"),
    ).href;
    appModulePromise = import(modulePath) as Promise<AppModule>;
  }
  return appModulePromise;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const serverApp = await loadServerApp();
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
