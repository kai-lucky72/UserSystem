import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectWithRetry = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query('SELECT 1'); // Test connection
      console.log('Database connected successfully');
      return pool;
    } catch (err) {
      retries++;
      console.log(`Database connection attempt ${retries} failed. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
    }
  }
  throw new Error('Failed to connect to database after multiple retries');
};

export const pool = await connectWithRetry();
export const db = drizzle({ client: pool, schema });