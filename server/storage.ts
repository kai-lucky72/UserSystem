import { users, attendance, clients, helpRequests, attendanceTimeFrame, dailyReports } from "@shared/schema";
import type { User, InsertUser, Attendance, InsertAttendance, Client, InsertClient, HelpRequest, InsertHelpRequest, UserRoleType, AttendanceTimeFrame, InsertAttendanceTimeFrame, DailyReport, InsertDailyReport } from "@shared/schema";
import { UserRole } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Create the memory store with the correct typing
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByWorkId(workId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWorkIdAndEmail(workId: string, email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllManagers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getAllAgentsByManagerId(managerId: number): Promise<User[]>;
  
  // Attendance
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceByUserIdAndDate(userId: number, date: Date): Promise<Attendance | undefined>;
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  
  // Attendance Time Frame
  createAttendanceTimeFrame(timeFrame: InsertAttendanceTimeFrame): Promise<AttendanceTimeFrame>;
  getAttendanceTimeFrameByManagerId(managerId: number): Promise<AttendanceTimeFrame | undefined>;
  updateAttendanceTimeFrame(id: number, timeFrame: Partial<InsertAttendanceTimeFrame>): Promise<AttendanceTimeFrame | undefined>;
  
  // Clients
  createClient(client: InsertClient): Promise<Client>;
  getClientsByAgentId(agentId: number): Promise<Client[]>;
  getAllClients(): Promise<Client[]>;
  
  // Help Requests
  createHelpRequest(helpRequest: InsertHelpRequest): Promise<HelpRequest>;
  getHelpRequests(resolved?: boolean): Promise<HelpRequest[]>;
  resolveHelpRequest(id: number): Promise<HelpRequest | undefined>;
  
  // Leader
  assignAgentAsLeader(agentId: number): Promise<User | undefined>;
  removeAgentAsLeader(agentId: number): Promise<User | undefined>;
  
  // Daily Reports
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  getDailyReportsByAgentId(agentId: number): Promise<DailyReport[]>;
  getDailyReportsByManagerId(managerId: number): Promise<DailyReport[]>;
  getDailyReportsByDate(date: Date): Promise<DailyReport[]>;
  getDailyReportsByDateRange(startDate: Date, endDate: Date): Promise<DailyReport[]>;
  
  // Session store - using more generic session.Store type
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private attendanceData: Map<number, Attendance>;
  private clientsData: Map<number, Client>;
  private helpRequestsData: Map<number, HelpRequest>;
  private attendanceTimeFrameData: Map<number, AttendanceTimeFrame>;
  private dailyReportsData: Map<number, DailyReport>;
  private currentId: { [key: string]: number };
  sessionStore: session.Store;

  constructor() {
    this.usersData = new Map();
    this.attendanceData = new Map();
    this.clientsData = new Map();
    this.helpRequestsData = new Map();
    this.attendanceTimeFrameData = new Map();
    this.dailyReportsData = new Map();
    this.currentId = {
      users: 1,
      attendance: 1,
      clients: 1,
      helpRequests: 1,
      attendanceTimeFrame: 1,
      dailyReports: 1,
    };
    
    // Use type assertion to ensure proper type compatibility
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Create default admin user
    const adminData: InsertUser = {
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      workId: "ADM001",
      nationalId: "1234567890",
      phoneNumber: "1234567890",
      password: "admin123",
      role: UserRole.ADMIN,
      managerId: null,
      isLeader: false
    };
    
    this.createUser(adminData).catch(err => {
      console.error("Failed to create default admin user:", err);
    });
  }

  // USER METHODS
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByWorkId(workId: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(user => user.workId === workId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(user => user.email === email);
  }

  async getUserByWorkIdAndEmail(workId: string, email: string): Promise<User | undefined> {
    console.log(`Searching for user with workId: ${workId} and email: ${email}`);
    
    const allUsers = Array.from(this.usersData.values());
    console.log(`Total users in database: ${allUsers.length}`);
    
    const user = allUsers.find(
      user => user.workId === workId && user.email === email
    );
    
    if (user) {
      console.log(`Found user: ${user.firstName} ${user.lastName} (${user.role})`);
    } else {
      console.log('User not found');
    }
    
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    // Create a properly typed User object from the InsertUser data
    const user: User = {
      id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      workId: userData.workId,
      nationalId: userData.nationalId,
      phoneNumber: userData.phoneNumber,
      password: userData.password ?? null,
      role: userData.role,
      managerId: userData.managerId ?? null,
      isLeader: userData.isLeader ?? false
    };
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.usersData.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const user = this.usersData.get(id);
    if (!user) return false;

    // If deleting a manager, also delete all associated agents
    if (user.role === UserRole.MANAGER) {
      const agentsToDelete = Array.from(this.usersData.values())
        .filter(agent => agent.managerId === id);
      
      for (const agent of agentsToDelete) {
        this.usersData.delete(agent.id);
      }
    }

    return this.usersData.delete(id);
  }

  async getAllManagers(): Promise<User[]> {
    return Array.from(this.usersData.values())
      .filter(user => user.role === UserRole.MANAGER);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersData.values());
  }

  async getAllAgentsByManagerId(managerId: number): Promise<User[]> {
    return Array.from(this.usersData.values())
      .filter(user => user.managerId === managerId && user.role === UserRole.AGENT);
  }

  // ATTENDANCE METHODS
  async markAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const id = this.currentId.attendance++;
    const attendance: Attendance = { ...attendanceData, id };
    this.attendanceData.set(id, attendance);
    return attendance;
  }

  async getAttendanceByUserIdAndDate(userId: number, date: Date): Promise<Attendance | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.attendanceData.values()).find(attendance => 
      attendance.userId === userId && 
      new Date(attendance.date) >= startOfDay && 
      new Date(attendance.date) <= endOfDay
    );
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.attendanceData.values()).filter(attendance => 
      new Date(attendance.date) >= startOfDay && 
      new Date(attendance.date) <= endOfDay
    );
  }

  // CLIENT METHODS
  async createClient(clientData: InsertClient): Promise<Client> {
    const id = this.currentId.clients++;
    const client: Client = { ...clientData, id };
    this.clientsData.set(id, client);
    return client;
  }

  async getClientsByAgentId(agentId: number): Promise<Client[]> {
    return Array.from(this.clientsData.values())
      .filter(client => client.agentId === agentId);
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clientsData.values());
  }

  // HELP REQUEST METHODS
  async createHelpRequest(helpRequestData: InsertHelpRequest): Promise<HelpRequest> {
    const id = this.currentId.helpRequests++;
    const helpRequest: HelpRequest = { 
      ...helpRequestData, 
      id, 
      resolved: false,
      createdAt: new Date()
    };
    this.helpRequestsData.set(id, helpRequest);
    return helpRequest;
  }

  async getHelpRequests(resolved?: boolean): Promise<HelpRequest[]> {
    let helpRequests = Array.from(this.helpRequestsData.values());
    
    if (resolved !== undefined) {
      helpRequests = helpRequests.filter(hr => hr.resolved === resolved);
    }
    
    return helpRequests;
  }

  async resolveHelpRequest(id: number): Promise<HelpRequest | undefined> {
    const helpRequest = this.helpRequestsData.get(id);
    if (!helpRequest) return undefined;

    const updatedHelpRequest = { ...helpRequest, resolved: true };
    this.helpRequestsData.set(id, updatedHelpRequest);
    return updatedHelpRequest;
  }

  // LEADER METHODS
  async assignAgentAsLeader(agentId: number): Promise<User | undefined> {
    const agent = this.usersData.get(agentId);
    if (!agent || agent.role !== UserRole.AGENT) return undefined;

    // If there's already a leader, remove their leader status
    const existingLeaders = Array.from(this.usersData.values())
      .filter(user => user.managerId === agent.managerId && user.isLeader);
    
    for (const leader of existingLeaders) {
      this.usersData.set(leader.id, { ...leader, isLeader: false });
    }

    // Set the new agent as leader
    const updatedAgent = { ...agent, isLeader: true };
    this.usersData.set(agentId, updatedAgent);
    return updatedAgent;
  }

  async removeAgentAsLeader(agentId: number): Promise<User | undefined> {
    const agent = this.usersData.get(agentId);
    if (!agent || agent.role !== UserRole.AGENT || !agent.isLeader) return undefined;

    const updatedAgent = { ...agent, isLeader: false };
    this.usersData.set(agentId, updatedAgent);
    return updatedAgent;
  }

  // ATTENDANCE TIME FRAME METHODS
  async createAttendanceTimeFrame(timeFrameData: InsertAttendanceTimeFrame): Promise<AttendanceTimeFrame> {
    const id = this.currentId.attendanceTimeFrame++;
    const timeFrame: AttendanceTimeFrame = { ...timeFrameData, id };
    this.attendanceTimeFrameData.set(id, timeFrame);
    return timeFrame;
  }

  async getAttendanceTimeFrameByManagerId(managerId: number): Promise<AttendanceTimeFrame | undefined> {
    return Array.from(this.attendanceTimeFrameData.values()).find(timeFrame => timeFrame.managerId === managerId);
  }

  async updateAttendanceTimeFrame(id: number, timeFrameData: Partial<InsertAttendanceTimeFrame>): Promise<AttendanceTimeFrame | undefined> {
    const timeFrame = this.attendanceTimeFrameData.get(id);
    if (!timeFrame) return undefined;

    const updatedTimeFrame = { ...timeFrame, ...timeFrameData };
    this.attendanceTimeFrameData.set(id, updatedTimeFrame);
    return updatedTimeFrame;
  }

  // DAILY REPORT METHODS
  async createDailyReport(reportData: InsertDailyReport): Promise<DailyReport> {
    const id = this.currentId.dailyReports++;
    const report: DailyReport = { ...reportData, id };
    this.dailyReportsData.set(id, report);
    return report;
  }

  async getDailyReportsByAgentId(agentId: number): Promise<DailyReport[]> {
    return Array.from(this.dailyReportsData.values())
      .filter(report => report.agentId === agentId);
  }

  async getDailyReportsByManagerId(managerId: number): Promise<DailyReport[]> {
    return Array.from(this.dailyReportsData.values())
      .filter(report => report.managerId === managerId);
  }

  async getDailyReportsByDate(date: Date): Promise<DailyReport[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.dailyReportsData.values())
      .filter(report => new Date(report.date) >= startOfDay && new Date(report.date) <= endOfDay);
  }

  async getDailyReportsByDateRange(startDate: Date, endDate: Date): Promise<DailyReport[]> {
    const startOfRange = new Date(startDate);
    const endOfRange = new Date(endDate);
    
    return Array.from(this.dailyReportsData.values())
      .filter(report => new Date(report.date) >= startOfRange && new Date(report.date) <= endOfRange);
  }
}

// Import DatabaseStorage
import { DatabaseStorage } from './database-storage';

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
