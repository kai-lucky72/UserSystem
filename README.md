
# Agent Management System

A comprehensive system for managing agents, attendance tracking, and performance monitoring.

## Features

- Multi-role system (Admin, Manager, Agent)
- Attendance tracking
- Client management
- Performance reporting
- Team leader assignment

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx drizzle-kit push:pg
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables

Create a `.env` file with:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
```

## Default Users

- Admin: admin@example.com / admin123
- Manager: manager@example.com / manager123
- Agent: agent@example.com / agent123
