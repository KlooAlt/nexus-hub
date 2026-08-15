import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";

type AppModule = {
  app: Express;
  initializeApp: () => Promise<void>;
};

let appModulePromise: Promise<AppModule> | undefined;

function loadServerApp(): Promise<AppModule> {
  if (!appModulePromise) {
    // The server graph is emitted by `tsc -p tsconfig.vercel.json` before
    // Vercel bundles this function. The generated file is JavaScript; the
    // source files remain TypeScript.
    // @ts-ignore Generated during the Vercel build.
    appModulePromise = import("../dist/vercel/server/app.js") as Promise<AppModule>;
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
