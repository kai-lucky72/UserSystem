import { users, attendance, clients, helpRequests } from "@shared/schema";
import type { User, InsertUser, Attendance, InsertAttendance, Client, InsertClient, HelpRequest, InsertHelpRequest, UserRoleType } from "@shared/schema";
import { UserRole } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

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
  getAllAgentsByManagerId(managerId: number): Promise<User[]>;
  
  // Attendance
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceByUserIdAndDate(userId: number, date: Date): Promise<Attendance | undefined>;
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  
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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private attendanceData: Map<number, Attendance>;
  private clientsData: Map<number, Client>;
  private helpRequestsData: Map<number, HelpRequest>;
  private currentId: { [key: string]: number };
  sessionStore: session.SessionStore;

  constructor() {
    this.usersData = new Map();
    this.attendanceData = new Map();
    this.clientsData = new Map();
    this.helpRequestsData = new Map();
    this.currentId = {
      users: 1,
      attendance: 1,
      clients: 1,
      helpRequests: 1,
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });

    // Create an admin user by default
    this.createUser({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      workId: "ADM001",
      nationalId: "1234567890",
      phoneNumber: "1234567890",
      password: "admin123",
      role: UserRole.ADMIN,
      managerId: undefined,
      isLeader: false,
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
    return Array.from(this.usersData.values()).find(
      user => user.workId === workId && user.email === email
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...userData, id };
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
}

export const storage = new MemStorage();
