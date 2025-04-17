import 'dotenv/config';
import { exec } from 'child_process';
import pkg from 'pg';
const { Pool } = pkg;
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const dbName = 'agent_management';

async function createDatabase() {
  console.log('Setting up database...');
  
  // Connect to default postgres database first
  const rootPool = new Pool({
    user: 'postgres',
    password: 'lucky',
    host: 'localhost',
    port: 5432,
    database: 'postgres' // Connect to default database first
  });

  try {
    // Check if database exists
    const checkResult = await rootPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkResult.rowCount === 0) {
      console.log(`Creating database ${dbName}...`);
      await rootPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created successfully!`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }

    console.log('Running drizzle migrations...');
    exec('npm run db:push', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log('Database setup completed successfully!');
      rl.close();
    });
  } catch (err) {
    console.error('Error setting up database:', err);
    process.exit(1);
  } finally {
    await rootPool.end();
  }
}

createDatabase(); 