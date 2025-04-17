import { pgTable, text, serial, integer, boolean, timestamp, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ROLE ENUM
export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// USER TABLE
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  workId: text("work_id").notNull().unique(),
  nationalId: text("national_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  password: text("password"),
  role: text("role").notNull().$type<UserRoleType>(),
  managerId: integer("manager_id").references(() => users.id, { onDelete: 'cascade' }),
  isLeader: boolean("is_leader").default(false),
});

// ATTENDANCE TABLE
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull().defaultNow(),
  sector: text("sector"),
  location: text("location"),
});

// ATTENDANCE TIME FRAME TABLE
export const attendanceTimeFrame = pgTable("attendance_time_frame", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  startTime: text("start_time").notNull(), // Format: "HH:MM" in 24-hour format
  endTime: text("end_time").notNull(),     // Format: "HH:MM" in 24-hour format
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// CLIENT TABLE
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  agentId: integer("agent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// HELP REQUEST TABLE
export const helpRequests = pgTable("help_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// DAILY REPORT TABLE
export const dailyReports = pgTable("daily_reports", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull().defaultNow(),
  comment: text("comment").notNull(),
  clientsData: text("clients_data").notNull(), // JSON string of clients data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// INSERT SCHEMAS
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertHelpRequestSchema = createInsertSchema(helpRequests).omit({
  id: true,
  resolved: true,
  createdAt: true,
});

export const insertAttendanceTimeFrameSchema = createInsertSchema(attendanceTimeFrame).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  workId: z.string().min(1, "Work ID is required"),
  email: z.string().min(1, "Email is required"),
  password: z.string().optional(),
});

export const helpRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required"),
  message: z.string().min(1, "Message is required"),
});

export const dailyReportSchema = z.object({
  comment: z.string().min(1, "Comment is required"),
  date: z.date().default(() => new Date()),
});

// TYPES
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof insertHelpRequestSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type HelpRequestData = z.infer<typeof helpRequestSchema>;
export type AttendanceTimeFrame = typeof attendanceTimeFrame.$inferSelect;
export type InsertAttendanceTimeFrame = z.infer<typeof insertAttendanceTimeFrameSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReportData = z.infer<typeof dailyReportSchema>;
