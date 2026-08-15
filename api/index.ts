import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app, initializeApp } from "../dist/vercel/server/app.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error) {
    console.error("API initialization failed:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "API initialization failed",
      });
    }
  }
}
