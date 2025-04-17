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
  console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
  
  // Add a delay to ensure database is fully provisioned
  console.log('Waiting 10 seconds for database to be fully provisioned...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  try {
    // Test database connection with retries
    let connected = false;
    let attempts = 0;
    const maxAttempts = 5;
    let pool;
    
    while (!connected && attempts < maxAttempts) {
      attempts++;
      console.log(`Database connection attempt ${attempts}/${maxAttempts}...`);
      
      try {
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }, // Required for Render's PostgreSQL
        });
        
        await pool.query('SELECT 1');
        connected = true;
        console.log('Successfully connected to database!');
      } catch (connectionError) {
        console.error(`Connection attempt ${attempts} failed:`, connectionError.message);
        if (attempts < maxAttempts) {
          console.log('Waiting 5 seconds before retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    if (!connected) {
      throw new Error(`Failed to connect to database after ${maxAttempts} attempts`);
    }

    // Apply migrations using drizzle-kit
    console.log('Running database migrations...');
    try {
      // Create a script to run migrations with proper environment variables
      const migrationScript = `
#!/bin/bash
export DATABASE_URL="${process.env.DATABASE_URL}"
export NODE_ENV="production"
npx drizzle-kit push
      `;
      
      await fs.writeFile('run_migrations.sh', migrationScript);
      await execPromise('chmod +x run_migrations.sh');
      
      const { stdout, stderr } = await execPromise('./run_migrations.sh');
      console.log('Migration output:', stdout);
      if (stderr) console.error('Migration errors:', stderr);
      
      console.log('Database migrations completed successfully');
    } catch (migrationError) {
      console.error('Error running migrations:', migrationError);
      // Continue despite migration errors
    }
    
    // Run the daily reports table creation script
    console.log('Creating daily reports table...');
    try {
      // Create a script to run table creation with proper environment
      const tableScript = `
#!/bin/bash
export DATABASE_URL="${process.env.DATABASE_URL}"
export NODE_ENV="production"
npx tsx scripts/create_daily_reports_table.ts
      `;
      
      await fs.writeFile('create_tables.sh', tableScript);
      await execPromise('chmod +x create_tables.sh');
      
      const { stdout, stderr } = await execPromise('./create_tables.sh');
      console.log('Table creation output:', stdout);
      if (stderr) console.error('Table creation errors:', stderr);
      
      console.log('Daily reports table created successfully');
    } catch (tableError) {
      console.error('Error creating daily reports table:', tableError);
    }
    
    // Create default users if needed
    console.log('Creating default users if needed...');
    try {
      // First check if admin user exists
      const { rows } = await pool.query("SELECT * FROM users WHERE email = 'admin@example.com' LIMIT 1");
      
      if (rows.length === 0) {
        console.log('Admin user not found, creating default users...');
        // Create a script to add default users
        const userScript = `
#!/bin/bash
export DATABASE_URL="${process.env.DATABASE_URL}"
export NODE_ENV="production"
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createDefaultUsers() {
  try {
    // Check/create admin
    await pool.query(\`
      INSERT INTO users (first_name, last_name, email, work_id, national_id, phone_number, password, role)
      VALUES ('Admin', 'User', 'admin@example.com', 'ADM001', '1234567890', '1234567890', 'admin123', 'admin')
      ON CONFLICT (email) DO NOTHING
    \`);
    
    // Check/create manager
    const managerResult = await pool.query(\`
      INSERT INTO users (first_name, last_name, email, work_id, national_id, phone_number, password, role)
      VALUES ('Manager', 'User', 'manager@example.com', 'MGR001', '0987654321', '0987654321', 'manager123', 'manager')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    \`);
    
    let managerId = null;
    if (managerResult.rows.length > 0) {
      managerId = managerResult.rows[0].id;
    } else {
      const existingManager = await pool.query('SELECT id FROM users WHERE email = \\'manager@example.com\\'');
      if (existingManager.rows.length > 0) {
        managerId = existingManager.rows[0].id;
      }
    }
    
    if (managerId) {
      // Create agent
      await pool.query(\`
        INSERT INTO users (first_name, last_name, email, work_id, national_id, phone_number, password, role, manager_id)
        VALUES ('Agent', 'User', 'agent@example.com', 'AGT001', '1122334455', '1122334455', 'agent123', 'agent', \${managerId})
        ON CONFLICT (email) DO NOTHING
      \`);
    }
    
    console.log('Default users created successfully');
  } catch (error) {
    console.error('Error creating default users:', error);
  } finally {
    await pool.end();
  }
}

createDefaultUsers();
"        
        `;
        
        await fs.writeFile('create_users.sh', userScript);
        await execPromise('chmod +x create_users.sh');
        
        const { stdout, stderr } = await execPromise('./create_users.sh');
        console.log('User creation output:', stdout);
        if (stderr) console.error('User creation errors:', stderr);
      } else {
        console.log('Admin user already exists, skipping default user creation');
      }
    } catch (userError) {
      console.error('Error creating default users:', userError);
    }
    
    if (pool) await pool.end();
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase().then(() => {
  console.log('Database setup complete');
  // Exit with success
  process.exit(0);
}).catch(err => {
  console.error('Database setup failed:', err);
  process.exit(1);
}); 