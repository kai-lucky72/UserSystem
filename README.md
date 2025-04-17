# UserSystem - Agent Management Application

A complete user management system for managing agents, attendance, clients, and daily reports.

## Features

- User roles: Admin, Manager, and Agent
- Attendance tracking
- Client management
- Daily reports
- Real-time communication via WebSockets
- Performance monitoring

## Technology Stack

- **Frontend**: React, TailwindCSS, Shadcn UI
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Authentication**: Session-based authentication
- **Real-time**: WebSockets

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_management
   SESSION_SECRET=your_secret_key
   ```
4. Set up the database:
   ```
   npm run setup
   ```
5. Run the development server:
   ```
   npm run dev
   ```

## Deployment on Render.com

This application can be easily deployed on Render.com using the provided `render.yaml` file:

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Create a new Render.com account or log in to your existing account
3. Click "New" and select "Blueprint"
4. Connect your Git repository
5. Render will automatically detect the `render.yaml` file and set up:
   - Web service for the application
   - PostgreSQL database
   - Environment variables

### Post-Deployment Configuration

After deploying to Render:

1. Once the database is created, you'll need to run migrations:
   - Go to your Web Service dashboard
   - Open the Shell
   - Run: `npx tsx scripts/create_daily_reports_table.ts`

2. Default credentials will be created:
   - Admin: workId: ADM001, email: admin@example.com, password: admin123
   - Manager: workId: MGR001, email: manager@example.com, password: manager123
   - Agent: workId: AGT001, email: agent@example.com, password: agent123

## License

MIT
