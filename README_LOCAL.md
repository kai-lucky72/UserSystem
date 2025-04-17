# Local Setup for Agent Management System

## Prerequisites
- Node.js (v16+)
- PostgreSQL installed locally (username: postgres, password: lucky)

## Setup Steps

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will automatically:
- Create the PostgreSQL database if it doesn't exist
- Set up the database tables
- Create default users if none exist

The application will be available at `http://localhost:5000`

## Default Users (created automatically)
- Admin: admin@example.com / admin123
- Manager: manager@example.com / manager123
- Agent: agent@example.com / agent123

## Manual Database Setup (optional)
If you prefer to set up the database manually:
```bash
npm run setup
```

## Configuration
The application uses the following environment variables (stored in .env):
- DATABASE_URL=postgresql://postgres:lucky@localhost:5432/agent_management
- JWT_SECRET=your-secret-key-local-development 