import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import process from 'process';
import * as fs from 'fs';
import * as path from 'path';

// Check for the database URL - in production this should be set via environment variables
if (!process.env.DATABASE_URL) {
  // In production exit with an error
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: DATABASE_URL must be set in production environment.');
    console.error('Make sure to set this environment variable in the Render dashboard.');
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  } else {
    // In development, just warn
    console.warn('Warning: DATABASE_URL not set in development environment.');
    console.warn('Using a placeholder connection string that will not work.');
  }
}

// For Aiven databases, we need a different approach to SSL
let connectionConfig;

// Check if we actually have a database URL to use
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  // Check if it's an Aiven database (based on the URL)
  if (dbUrl.includes('aivencloud.com')) {
    console.log('Detected Aiven database - using special connection configuration');
    
    // Extract connection parts from the URL
    const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    
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
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false
        }
      };
    }
  } else {
    // For non-Aiven databases, use the standard configuration
    connectionConfig = {
      connectionString: dbUrl
    };
  }
} else {
  // If DATABASE_URL is not set, use a placeholder that will be replaced in production
  connectionConfig = {
    connectionString: 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
  };
}

// Create the connection pool
console.log('Initializing database connection pool...');
export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });

// Initialize database connection
const initDb = async () => {
  try {
    if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
      console.warn('Skipping database connection test - no DATABASE_URL provided');
      return;
    }
    
    // Test connection
    const { rows } = await pool.query('SELECT 1 as connection_test');
    if (rows[0]?.connection_test === 1) {
      console.log('Database connected successfully ✅');
    }
  } catch (err) {
    console.error('Database connection test failed:', err);
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }
};

// Call initialization
initDb().catch(err => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Failed to initialize database in production:', err);
    // In production, exit the process on database connection failure
    process.exit(1);
  } else {
    console.error('Failed to initialize database in development:', err);
    // Let the application continue to run in development
  }
});
