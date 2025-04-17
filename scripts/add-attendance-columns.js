// ES Module migration script to add sector and location columns to attendance table
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// Create a new PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agent_management',
});

async function addAttendanceColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database. Checking for existing columns...');
    
    // Check if the columns already exist
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance' 
      AND column_name IN ('sector', 'location');
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    const columnsToAdd = [];
    
    if (!existingColumns.includes('sector')) {
      columnsToAdd.push('sector VARCHAR(100)');
    }
    
    if (!existingColumns.includes('location')) {
      columnsToAdd.push('location VARCHAR(100)');
    }
    
    // Add the columns if they don't exist
    if (columnsToAdd.length > 0) {
      const alterQuery = `ALTER TABLE attendance ADD ${columnsToAdd.join(', ADD ')};`;
      console.log(`Executing: ${alterQuery}`);
      await client.query(alterQuery);
      console.log('Successfully added new columns to the attendance table.');
    } else {
      console.log('All required columns already exist in the attendance table.');
    }
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addAttendanceColumns(); 