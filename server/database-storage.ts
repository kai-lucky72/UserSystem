import { 
  User, 
  Attendance, 
  Client, 
  HelpRequest, 
  InsertUser,
  InsertAttendance,
  InsertClient,
  InsertHelpRequest,
  UserRole
} from "@shared/schema";
import { db } from "./db";
import { users, attendance, clients, helpRequests } from "@shared/schema";
import { eq, and, isNull, desc, asc, gte, lte } from "drizzle-orm";
import { IStorage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Create PostgreSQL session store
const PostgresSessionStore = connectPgSimple(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByWorkId(workId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.workId, workId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByWorkIdAndEmail(workId: string, email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.workId, workId),
        eq(users.email, email)
      )
    );
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getAllManagers(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(eq(users.role, UserRole.MANAGER))
      .orderBy(asc(users.firstName));
  }

  async getAllAgentsByManagerId(managerId: number): Promise<User[]> {
    return db.select()
      .from(users)
      .where(and(
        eq(users.role, UserRole.AGENT),
        eq(users.managerId, managerId)
      ))
      .orderBy(asc(users.firstName));
  }

  async markAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [result] = await db.insert(attendance)
      .values(attendanceData)
      .returning();
    return result;
  }

  async getAttendanceByUserIdAndDate(userId: number, date: Date): Promise<Attendance | undefined> {
    // Set start of day and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Compare dates with direct gte/lte operators
    const [result] = await db.select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          and(
            // Date is greater than or equal to start of day
            gte(attendance.date, startOfDay),
            // Date is less than or equal to end of day
            lte(attendance.date, endOfDay)
          )
        )
      );
    
    return result;
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    // Set start of day and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Compare dates with direct gte/lte operators
    return db.select()
      .from(attendance)
      .where(
        and(
          // Date is greater than or equal to start of day
          gte(attendance.date, startOfDay),
          // Date is less than or equal to end of day
          lte(attendance.date, endOfDay)
        )
      );
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients)
      .values({
        ...clientData,
        createdAt: new Date()
      })
      .returning();
    
    return client;
  }

  async getClientsByAgentId(agentId: number): Promise<Client[]> {
    return db.select()
      .from(clients)
      .where(eq(clients.agentId, agentId))
      .orderBy(desc(clients.createdAt));
  }

  async getAllClients(): Promise<Client[]> {
    return db.select()
      .from(clients)
      .orderBy(desc(clients.createdAt));
  }

  async createHelpRequest(helpRequestData: InsertHelpRequest): Promise<HelpRequest> {
    const [helpRequest] = await db.insert(helpRequests)
      .values({
        ...helpRequestData,
        createdAt: new Date(),
        resolved: false
      })
      .returning();
    
    return helpRequest;
  }

  async getHelpRequests(resolved?: boolean): Promise<HelpRequest[]> {
    if (resolved === undefined) {
      return db.select()
        .from(helpRequests)
        .orderBy(desc(helpRequests.createdAt));
    }
    
    return db.select()
      .from(helpRequests)
      .where(eq(helpRequests.resolved, resolved))
      .orderBy(desc(helpRequests.createdAt));
  }

  async resolveHelpRequest(id: number): Promise<HelpRequest | undefined> {
    const [updatedRequest] = await db.update(helpRequests)
      .set({ resolved: true })
      .where(eq(helpRequests.id, id))
      .returning();
    
    return updatedRequest;
  }

  async assignAgentAsLeader(agentId: number): Promise<User | undefined> {
    // First, get the agent to check if they exist
    const agent = await this.getUser(agentId);
    if (!agent || agent.role !== UserRole.AGENT) return undefined;
    
    // Get all agents with the same manager
    const agents = await this.getAllAgentsByManagerId(agent.managerId!);
    
    // Remove leader status from any current leaders
    for (const existingAgent of agents) {
      if (existingAgent.isLeader) {
        await this.updateUser(existingAgent.id, { isLeader: null });
      }
    }
    
    // Make the selected agent a leader
    const updatedAgent = await this.updateUser(agentId, { isLeader: 1 });
    return updatedAgent;
  }

  async removeAgentAsLeader(agentId: number): Promise<User | undefined> {
    const agent = await this.getUser(agentId);
    if (!agent || agent.role !== UserRole.AGENT || !agent.isLeader) {
      return undefined;
    }
    
    const updatedAgent = await this.updateUser(agentId, { isLeader: null });
    return updatedAgent;
  }
}