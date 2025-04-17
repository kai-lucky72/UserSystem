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

## Deployment Options

### Option 1: Render.com

This application can be easily deployed on Render.com using the provided `render.yaml` file:

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Create a new Render.com account or log in to your existing account
3. Click "New" and select "Blueprint"
4. Connect your Git repository
5. Render will automatically detect the `render.yaml` file and set up:
   - Web service for the application
   - PostgreSQL database
   - Environment variables

#### Post-Deployment Configuration (Render)

After deploying to Render:

1. Once the database is created, you'll need to run migrations:
   - Go to your Web Service dashboard
   - Open the Shell
   - Run: `npx tsx scripts/create_daily_reports_table.ts`

2. Default credentials will be created:
   - Admin: workId: ADM001, email: admin@example.com, password: admin123
   - Manager: workId: MGR001, email: manager@example.com, password: manager123
   - Agent: workId: AGT001, email: agent@example.com, password: agent123

### Option 2: Vercel

This application can also be deployed to Vercel using the provided `vercel.json` file:

1. Push your code to a GitHub repository
2. Create a Vercel account if you don't have one already
3. Create a new project on Vercel and import your GitHub repository
4. **Important**: Set up an external PostgreSQL database (Vercel doesn't provide database hosting)
   - Options include: [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)
5. Add the following environment variables in Vercel's dashboard:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A secure random string for session encryption

#### Post-Deployment Configuration (Vercel)

After deploying to Vercel:

1. Set up your database schema:
   - Run locally: `DATABASE_URL=your_production_db_url npm run db:push`
   - Or use the Vercel CLI to run: `vercel run npx tsx scripts/create_daily_reports_table.ts`

2. The same default credentials will be created as in the Render deployment.

## License

MIT
