import 'dotenv/config';
import { pool } from '../server/db';

async function createDailyReportsTable() {
  try {
    console.log('Creating daily_reports table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS daily_reports (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        comment TEXT NOT NULL,
        clients_data TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('daily_reports table created successfully!');
    
  } catch (error) {
    console.error('Error creating daily_reports table:', error);
  } finally {
    // Close the pool when done
    await pool.end();
  }
}

// Run the function
createDailyReportsTable(); 