import {
  User,
  InsertUser,
  Client,
  InsertClient,
  HelpRequest,
  InsertHelpRequest,
  Attendance,
  InsertAttendance,
  UserRole,
  AttendanceTimeFrame,
  InsertAttendanceTimeFrame,
  attendanceTimeFrame,
  DailyReport,
  InsertDailyReport,
  dailyReports,
  users,
  attendance,
  clients,
  helpRequests
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc, asc, gte, lte, or, count, inArray } from "drizzle-orm";
import { IStorage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { hashPassword } from "./auth";
import { log } from "./vite";

// Create PostgreSQL session store
const PostgresSessionStore = connectPgSimple(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private isDbReady: boolean = false;
  private dbInitRetries: number = 0;
  private maxRetries: number = 10;

  constructor() {
    // Use a session store that doesn't require immediate database connection
    this.sessionStore = new session.MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Initialize default users only after database connection is established
    this.initDatabase().catch(err => {
      console.error('Error initializing database connection:', err);
    });
  }

  private async initDatabase() {
    try {
      // Wait for the database to be available
      while (!this.isDbReady && this.dbInitRetries < this.maxRetries) {
        try {
          this.dbInitRetries++;
          console.log(`Database init attempt ${this.dbInitRetries}/${this.maxRetries}...`);
          
          // Test if the database is available
          await db.select().from(users).limit(1);
          
          // If we get here, the database is ready
          this.isDbReady = true;
          console.log('Database connection established successfully.');
          
          // Now initialize session store with the proper PostgreSQL store
          if (pool) {
            this.sessionStore = new PostgresSessionStore({ 
              pool,
              createTableIfMissing: true 
            });
            console.log('PostgreSQL session store initialized.');
          }
          
          // Now we can initialize default users
          await this.initializeDefaultUsers();
          return;
        } catch (err) {
          console.warn(`Database not ready yet (attempt ${this.dbInitRetries}/${this.maxRetries}): ${err}`);
          if (this.dbInitRetries >= this.maxRetries) {
            console.error('Max database connection attempts reached. Continuing with limited functionality.');
            break;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  // Ensure database is ready before attempting operations
  private async ensureDbReady() {
    if (!this.isDbReady) {
      console.warn('Database not yet ready. Operation may fail.');
      return false;
    }
    return true;
  }
  
  // Initialize default users if they don't exist
  async initializeDefaultUsers() {
    try {
      if (!await this.ensureDbReady()) return;
      
      // Check if admin user exists
      const adminQuery = "SELECT * FROM users WHERE email = 'admin@example.com'";
      const adminResult = await pool.query(adminQuery);
      
      // Check if manager user exists
      const managerQuery = "SELECT * FROM users WHERE email = 'manager@example.com'";
      const managerResult = await pool.query(managerQuery);
      
      // Check if agent user exists
      const agentQuery = "SELECT * FROM users WHERE email = 'agent@example.com'";
      const agentResult = await pool.query(agentQuery);
      
      let adminId = null;
      let managerId = null;
      
      // If all users exist, we're done
      if (adminResult.rows.length > 0 && managerResult.rows.length > 0 && agentResult.rows.length > 0) {
        log('All default users already exist');
        return;
      }
      
      log('Creating default users...');
      
      // Create admin user if it doesn't exist
      if (adminResult.rows.length === 0) {
        const adminPassword = await hashPassword('admin123');
        const createAdminQuery = `
          INSERT INTO users (
            first_name, last_name, email, work_id, national_id, 
            phone_number, password, role, is_leader
          ) 
          VALUES (
            'Admin', 'User', 'admin@example.com', 'ADM001', '1234567890', 
            '1234567890', $1, 'admin', false
          ) 
          RETURNING id`;
        
        const adminInsertResult = await pool.query(createAdminQuery, [adminPassword]);
        adminId = adminInsertResult.rows[0].id;
        log('Admin user created successfully');
      } else {
        adminId = adminResult.rows[0].id;
      }
      
      // Create manager user if it doesn't exist
      if (managerResult.rows.length === 0) {
        const managerPassword = await hashPassword('manager123');
        const createManagerQuery = `
          INSERT INTO users (
            first_name, last_name, email, work_id, national_id, 
            phone_number, password, role, is_leader
          ) 
          VALUES (
            'Manager', 'User', 'manager@example.com', 'MGR001', '0987654321', 
            '0987654321', $1, 'manager', false
          ) 
          RETURNING id`;
        
        const managerInsertResult = await pool.query(createManagerQuery, [managerPassword]);
        managerId = managerInsertResult.rows[0].id;
        log('Manager user created successfully');
      } else {
        managerId = managerResult.rows[0].id;
      }
      
      // Create agent user if it doesn't exist
      if (agentResult.rows.length === 0) {
        const agentPassword = await hashPassword('agent123');
        const createAgentQuery = `
          INSERT INTO users (
            first_name, last_name, email, work_id, national_id, 
            phone_number, password, role, manager_id, is_leader
          ) 
          VALUES (
            'Agent', 'User', 'agent@example.com', 'AGT001', '1122334455', 
            '1122334455', $1, 'agent', $2, false
          )`;
        
        await pool.query(createAgentQuery, [agentPassword, managerId]);
        log('Agent user created successfully');
      }
      
      log('Default users setup completed');
    } catch (err) {
      console.error('Error initializing default users:', err);
      // Log but don't throw - we want the app to start even if user creation fails
    }
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
    console.log(`DB Storage: Searching for user with workId: ${workId} and email: ${email}`);
    
    try {
      const [user] = await db.select().from(users).where(
        and(
          eq(users.workId, workId),
          eq(users.email, email)
        )
      );
      
      if (user) {
        console.log(`DB Storage: Found user: ${user.firstName} ${user.lastName} (${user.role})`);
        console.log(`DB Storage: User password is ${user.password ? 'SET' : 'NULL'}`);
      } else {
        console.log('DB Storage: User not found');
        
        // For debugging, let's check if either workId or email exists separately
        const userByWorkId = await this.getUserByWorkId(workId);
        const userByEmail = await this.getUserByEmail(email);
        
        if (userByWorkId) {
          console.log(`DB Storage: Found user with workId ${workId} but email doesn't match`);
        }
        
        if (userByEmail) {
          console.log(`DB Storage: Found user with email ${email} but workId doesn't match`);
        }
      }
      
      return user;
    } catch (error) {
      console.error('DB Storage: Error in getUserByWorkIdAndEmail:', error);
      return undefined;
    }
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

  async getAllUsers(): Promise<User[]> {
    return db.select()
      .from(users)
      .orderBy(eq(users.role, UserRole.ADMIN), desc(users.role)) // Order by role (Admin first, then Manager, then Agent)
      .orderBy(asc(users.firstName));
  }

  async getDefaultUsers(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(
        and(
          eq(users.firstName, "Default"),
          or(
            eq(users.role, UserRole.AGENT),
            eq(users.role, UserRole.MANAGER)
          )
        )
      );
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

  async createAttendanceTimeFrame(timeFrameData: InsertAttendanceTimeFrame): Promise<AttendanceTimeFrame> {
    const [result] = await db.insert(attendanceTimeFrame)
      .values({
        ...timeFrameData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return result;
  }

  async getAttendanceTimeFrameByManagerId(managerId: number): Promise<AttendanceTimeFrame | undefined> {
    const [result] = await db.select()
      .from(attendanceTimeFrame)
      .where(eq(attendanceTimeFrame.managerId, managerId))
      .orderBy(desc(attendanceTimeFrame.updatedAt))
      .limit(1);
    
    return result;
  }

  async updateAttendanceTimeFrame(id: number, timeFrameData: Partial<InsertAttendanceTimeFrame>): Promise<AttendanceTimeFrame | undefined> {
    const [updatedTimeFrame] = await db
      .update(attendanceTimeFrame)
      .set({
        ...timeFrameData,
        updatedAt: new Date()
      })
      .where(eq(attendanceTimeFrame.id, id))
      .returning();
    
    return updatedTimeFrame;
  }

  // Daily Reports methods
  async createDailyReport(reportData: InsertDailyReport): Promise<DailyReport> {
    const [report] = await db.insert(dailyReports)
      .values({
        ...reportData,
        createdAt: new Date()
      })
      .returning();
    
    return report;
  }

  async getDailyReportsByAgentId(agentId: number): Promise<DailyReport[]> {
    return db.select()
      .from(dailyReports)
      .where(eq(dailyReports.agentId, agentId))
      .orderBy(desc(dailyReports.date));
  }

  async getDailyReportsByManagerId(managerId: number): Promise<DailyReport[]> {
    // This requires joining with users to get all agents under a manager
    const agents = await this.getAllAgentsByManagerId(managerId);
    const agentIds = agents.map(agent => agent.id);
    
    if (agentIds.length === 0) {
      return [];
    }
    
    return db.select()
      .from(dailyReports)
      .where(inArray(dailyReports.agentId, agentIds))
      .orderBy(desc(dailyReports.date));
  }

  async getDailyReportsByDate(date: Date): Promise<DailyReport[]> {
    // Set start of day and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return db.select()
      .from(dailyReports)
      .where(
        and(
          gte(dailyReports.date, startOfDay),
          lte(dailyReports.date, endOfDay)
        )
      )
      .orderBy(desc(dailyReports.date));
  }

  async getDailyReportsByDateRange(startDate: Date, endDate: Date): Promise<DailyReport[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return db.select()
      .from(dailyReports)
      .where(
        and(
          gte(dailyReports.date, start),
          lte(dailyReports.date, end)
        )
      )
      .orderBy(desc(dailyReports.date));
  }
}