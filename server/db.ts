import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import process from 'process';
import * as fs from 'fs';
import * as path from 'path';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// For Aiven databases, we need a different approach to SSL
let connectionConfig;

// Check if it's an Aiven database (based on the URL)
if (process.env.DATABASE_URL.includes('aivencloud.com')) {
  console.log('Detected Aiven database - using special connection configuration');
  
  // Extract connection parts from the URL
  const match = process.env.DATABASE_URL.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  
  if (match) {
    const [, user, password, host, port, database] = match;
    
    // Use a direct configuration to avoid SSL issues
    connectionConfig = {
      user,
      password,
      host,
      port: parseInt(port),
      database,
      ssl: {
        rejectUnauthorized: false
      }
    };
  } else {
    // Fallback to using the URL if parsing fails
    connectionConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }
} else {
  // For non-Aiven databases, use the standard configuration
  connectionConfig = {
    connectionString: process.env.DATABASE_URL
  };
}

// Create the connection pool
console.log('Initializing database connection pool...');
export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });

// Initialize database connection
const initDb = async () => {
  try {
    // Test connection
    const { rows } = await pool.query('SELECT 1 as connection_test');
    if (rows[0]?.connection_test === 1) {
      console.log('Database connected successfully ✅');
    }
  } catch (err) {
    console.error('Database connection test failed:', err);
    throw err;
  }
};

// Call initialization
initDb().catch(err => {
  console.error('Failed to initialize database:', err);
  // Let the application continue to run, even if the database connection failed
});
