import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { usersRouter } from "./server/routes/usersRouter";
import { aiRouter } from "./server/routes/aiRouter";
import { healthRouter } from "./server/routes/healthRouter";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust reverse proxy for Cloud Run and Nginx
  app.set("trust proxy", true);

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // Body parsers
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Modular API Routes
  app.use("/api/health", healthRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/ai", aiRouter);

  // Global 404 for unknown /api routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
  });

  // Vite middleware in dev, static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[HT GRIND Server Error]:", err);
    res.status(500).json({ error: "Internal Server Error", message: err?.message || "Unknown error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HT GRIND Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
