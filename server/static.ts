import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const possiblePaths = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(__dirname, "public"),
  ];

  const distPath = possiblePaths.find((p) => fs.existsSync(p));

  if (!distPath) {
    throw new Error(
      `Could not find the client build directory. Checked:\n${possiblePaths.join(
        "\n",
      )}`,
    );
  }

  console.log(`Serving static files from: ${distPath}`);

  app.use(
    express.static(distPath, {
      index: "index.html",
    }),
  );

  // React/Wouter client-side routing fallback.
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
