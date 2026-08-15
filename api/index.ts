import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

let initialized = false;
let initializationPromise: Promise<void> | null = null;

async function initialize() {
  if (initialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    await registerRoutes(httpServer, app);
    initialized = true;
  })();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    await initialize();

    return app(req, res);
  } catch (error) {
    console.error("Vercel API initialization error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Server initialization failed",
        error:
          process.env.NODE_ENV === "development"
            ? String(error)
            : undefined,
      });
    }
  }
}
