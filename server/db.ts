import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

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

// Initialize pool and db with proper types
export let pool: pkg.Pool;
export let db: NodePgDatabase<typeof schema>;

// Initialize database connection
const initDb = async () => {
  pool = await connectWithRetry();
  db = drizzle(pool, { schema });
};

// Call initialization
initDb().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
