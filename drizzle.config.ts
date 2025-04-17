import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

// In production environments like Render, this should be set via the dashboard, not .env file
const dbUrl = process.env.DATABASE_URL;

// Only run validation in development mode, not during build
if (process.env.NODE_ENV !== 'production' && !dbUrl) {
  console.warn('DATABASE_URL not found. Database migrations will not work.');
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
