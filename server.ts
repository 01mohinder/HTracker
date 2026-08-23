import "dotenv/config";
import express from "express";
import path from "path";
import { usersRouter } from "./server/routes/usersRouter";
import { aiRouter } from "./server/routes/aiRouter";
import { healthRouter } from "./server/routes/healthRouter";
import { analyticsRouter } from "./server/routes/analyticsRouter";
import { habitsRouter } from "./server/routes/habitsRouter";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Trust reverse proxy for Cloud Run and Nginx
  app.set("trust proxy", true);

  // Security, CORS, CSP and performance headers middleware
  app.use((req, res, next) => {
    // CORS headers
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-key, x-dev-key"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    // Security Headers
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://securetoken.googleapis.com; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com;"
    );
    next();
  });

  // Body parsers with safe request size bounds (6MB max for multimodal uploads)
  app.use(express.json({ limit: "6mb" }));
  app.use(express.urlencoded({ extended: true, limit: "6mb" }));

  // Block any requests attempting to download server binaries, sourcemaps, or internal files
  app.use((req, res, next) => {
    if (
      req.path.endsWith(".cjs") ||
      req.path.endsWith(".map") ||
      req.path.endsWith(".ts") ||
      req.path.endsWith(".env") ||
      req.path.includes("dist-server") ||
      req.path.includes("server.cjs")
    ) {
      return res.status(404).send("Not Found");
    }
    next();
  });

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
    const { createServer: createViteServer } = await import("vite");
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

  // Global error handler with client-safe error masking
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[HT GRIND Server Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    const isDev = process.env.NODE_ENV !== "production";
    res.status(err.status || 500).json({
      error: "An internal server error occurred. Please try again later.",
      timestamp: new Date().toISOString(),
      ...(isDev ? { devDetails: err?.message } : {}),
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

