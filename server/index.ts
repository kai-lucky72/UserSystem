import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import pkg from 'pg';
const { Pool } = pkg;
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Function to ensure database exists
async function ensureDatabase() {
  const dbName = 'agent_management';
  const connectionString = process.env.DATABASE_URL || '';
  
  // Only process if we have a local PostgreSQL connection
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    try {
      log('Checking database...');
      // Extract credentials from connection string to connect to default postgres database
      const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
      
      if (match) {
        const [, user, password, host, port] = match;
        
        // Connect to default postgres database
        const rootPool = new Pool({
          user,
          password,
          host,
          port: parseInt(port),
          database: 'postgres'
        });
        
        // Check if our application database exists
        const checkResult = await rootPool.query(
          "SELECT 1 FROM pg_database WHERE datname = $1",
          [dbName]
        );
        
        // Create database if it doesn't exist
        if (checkResult.rowCount === 0) {
          log(`Creating database ${dbName}...`);
          await rootPool.query(`CREATE DATABASE ${dbName}`);
          log(`Database ${dbName} created successfully!`);
          
          // Run migrations
          log('Running database migrations...');
          const { stdout, stderr } = await execAsync('npm run db:push');
          if (stderr) log(`Migration warnings: ${stderr}`);
          log(`Migration complete: ${stdout}`);
        }
        
        await rootPool.end();
      }
    } catch (err) {
      log(`Database initialization error: ${err}`);
      // Continue anyway, as the main app will show proper error if DB isn't available
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Ensure database exists before starting server
  await ensureDatabase();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
