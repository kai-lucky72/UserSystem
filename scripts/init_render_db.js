// Script to initialize database after deployment on Render
import dotenv from 'dotenv';
import pg from 'pg';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execPromise = promisify(exec);
dotenv.config();

const { Pool } = pg;

async function initializeDatabase() {
  console.log('Initializing database on Render...');
  
  try {
    // Test database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    await pool.query('SELECT 1');
    console.log('Successfully connected to database');

    // Apply migrations using drizzle-kit
    console.log('Running database migrations...');
    try {
      await execPromise('npx drizzle-kit push');
      console.log('Database migrations completed successfully');
    } catch (migrationError) {
      console.error('Error running migrations:', migrationError);
      process.exit(1);
    }
    
    // Run the daily reports table creation script
    console.log('Creating daily reports table...');
    try {
      await execPromise('npx tsx scripts/create_daily_reports_table.ts');
      console.log('Daily reports table created successfully');
    } catch (tableError) {
      console.error('Error creating daily reports table:', tableError);
    }
    
    await pool.end();
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 