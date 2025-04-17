#!/bin/bash
# Script to create necessary database tables after deployment

echo "Starting direct database table creation script..."

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Create temporary SQL file
cat > create_tables.sql << EOL
-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  work_id TEXT NOT NULL UNIQUE,
  national_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL,
  manager_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT FALSE
);

-- Create attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sector TEXT,
  location TEXT
);

-- Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create help_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS help_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create attendance_time_frame table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance_time_frame (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create daily_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  comment TEXT NOT NULL,
  clients_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default users if they don't exist
INSERT INTO users (first_name, last_name, email, work_id, national_id, phone_number, password, role)
VALUES ('Admin', 'User', 'admin@example.com', 'ADM001', '1234567890', '1234567890', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (first_name, last_name, email, work_id, national_id, phone_number, password, role)
VALUES ('Manager', 'User', 'manager@example.com', 'MGR001', '0987654321', '0987654321', 'manager123', 'manager')
ON CONFLICT (email) DO NOTHING;

-- Insert agent with manager reference
DO \$\$
DECLARE
  manager_id INTEGER;
BEGIN
  SELECT id INTO manager_id FROM users WHERE email = 'manager@example.com' LIMIT 1;
  
  IF manager_id IS NOT NULL THEN
    INSERT INTO users (first_name, last_name, email, work_id, national_id, phone_number, password, role, manager_id)
    VALUES ('Agent', 'User', 'agent@example.com', 'AGT001', '1122334455', '1122334455', 'agent123', 'agent', manager_id)
    ON CONFLICT (email) DO NOTHING;
  END IF;
END \$\$;
EOL

# Run the SQL file
if command -v psql > /dev/null; then
  # Use psql if available
  echo "Using psql to execute SQL..."
  PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
  psql $(echo $DATABASE_URL | sed 's/^postgres/postgresql/') -f create_tables.sql
else
  # Download and use pg_client if psql is not available
  echo "psql not found, using alternative method..."
  # Using curl to directly execute SQL against the database
  curl -X POST $(echo $DATABASE_URL | sed 's/^postgres/https/;s/?.*//') \
    -H "Content-Type: application/sql" \
    -d @create_tables.sql
fi

echo "Database tables creation script completed" 