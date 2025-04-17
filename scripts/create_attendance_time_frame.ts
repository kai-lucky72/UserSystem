import 'dotenv/config';
import { pool } from '../server/db';

async function createAttendanceTimeFrameTable() {
  try {
    console.log('Creating attendance_time_frame table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS attendance_time_frame (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('attendance_time_frame table created successfully!');
    
  } catch (error) {
    console.error('Error creating attendance_time_frame table:', error);
  } finally {
    // Close the pool when done
    await pool.end();
  }
}

// Run the function
createAttendanceTimeFrameTable(); 