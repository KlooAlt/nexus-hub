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
let initPromise: Promise<void> | undefined;

async function initialize() {
  if (initialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      await registerRoutes(httpServer, app);

      initialized = true;
    })();
  }

  await initPromise;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    await initialize();

    return app(req, res);
  } catch (error) {
    console.error("API FUNCTION ERROR:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "API initialization failed",
      });
    }
  }
}
