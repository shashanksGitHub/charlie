import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerGodmodelAPI } from "./godmodel-api";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json({ limit: "10gb" }));
app.use(express.urlencoded({ extended: false, limit: "10gb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  // Godmodel API endpoints
  registerGodmodelAPI(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Determine environment - prioritize REPLIT_DEPLOYMENT over NODE_ENV
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
  
  if (isProduction) {
    console.log("[SERVER] Running in production mode - serving static files");
    serveStatic(app);
  } else {
    console.log("[SERVER] Running in development mode - using Vite middleware");
    await setupVite(app, server);
  }

  startServer(server, () => {
    log("Server started successfully");
  });
})();

/**
 * Starts the server on available port with fast startup
 * @param server - The HTTP server to start
 * @param callback - Optional callback to run after server starts
 */
function startServer(server: any, callback?: () => void) {
  let port = parseInt(process.env.PORT || "5000");
  const host = "0.0.0.0";
  const maxAttempts = 10;
  let attempts = 0;

  function tryPort(currentPort: number) {
    if (attempts >= maxAttempts) {
      log(`Failed to find available port after ${maxAttempts} attempts`);
      process.exit(1);
      return;
    }

    attempts++;
    server
      .listen(currentPort, host, () => {
        log(`Server listening at http://${host}:${currentPort}`);
        if (callback) callback();
      })
      .on("error", (err: Error) => {
        if (err.message.includes("EADDRINUSE")) {
          log(
            `Port ${currentPort} is in use, trying port ${currentPort + 1}...`,
          );
          // Close the server before trying the next port
          server.close(() => {
            tryPort(currentPort + 1);
          });
        } else {
          log(`Failed to start server: ${err.message}`);
          process.exit(1);
        }
      });
  }

  tryPort(port);
}
