import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { usersRouter } from "./server/routes/usersRouter";
import { aiRouter } from "./server/routes/aiRouter";
import { healthRouter } from "./server/routes/healthRouter";
import { analyticsRouter } from "./server/routes/analyticsRouter";
import { habitsRouter } from "./server/routes/habitsRouter";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust reverse proxy for Cloud Run and Nginx
  app.set("trust proxy", true);

  // Security and performance headers middleware
  app.use((req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // Body parsers with high-accuracy JSON support
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Modular API Routes
  app.use("/api/health", healthRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/habits", habitsRouter);

  // Global 404 for unmatched /api routes
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

  // Global error handler with structured diagnostics
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[HT GRIND Server Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || "Unknown error",
      timestamp: new Date().toISOString(),
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HT GRIND Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[HT GRIND Fatal Startup Error]:", err);
  process.exit(1);
});

