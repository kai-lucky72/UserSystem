import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { UserRole, insertUserSchema, insertAttendanceSchema, insertClientSchema } from "@shared/schema";
import { format } from "date-fns";
import { WebSocketServer, WebSocket as WS } from "ws";

// Type definitions for WebSocket connections
interface ExtendedWebSocket extends WS {
  userId?: number;
  role?: string;
  managerId?: number | null;
  isAlive: boolean;
}

// Global WebSocket server instance
let wss: WebSocketServer;

// WebSocket connection map for easy access
const wsConnections = new Map<number, ExtendedWebSocket[]>();

// Ping all clients periodically to keep connections alive
function setupWebSocketHeartbeat() {
  setInterval(() => {
    wss.clients.forEach((ws: any) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) return extWs.terminate();
      
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);
}

// Send a message to all clients with a specific role
function notifyByRole(role: string, data: any) {
  wss.clients.forEach((client: any) => {
    const extClient = client as ExtendedWebSocket;
    if (extClient.role === role && extClient.readyState === WS.OPEN) {
      extClient.send(JSON.stringify(data));
    }
  });
}

// Send a message to a specific user
function notifyUser(userId: number, data: any) {
  const userConnections = wsConnections.get(userId) || [];
  userConnections.forEach(ws => {
    if (ws.readyState === WS.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

// Send a message to all users managed by a specific manager
function notifyManagerTeam(managerId: number, data: any) {
  wss.clients.forEach((client: any) => {
    const extClient = client as ExtendedWebSocket;
    if ((extClient.managerId === managerId || extClient.userId === managerId) && extClient.readyState === WS.OPEN) {
      extClient.send(JSON.stringify(data));
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes (/api/login, /api/logout, /api/user)
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws' // Use a specific path to avoid conflicts with Vite
  });
  
  // WebSocket connection handling
  wss.on("connection", (ws: WS) => {
    // Cast to our extended type and initialize properties
    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;
    
    // Handle pong responses
    extWs.on("pong", () => {
      extWs.isAlive = true;
    });
    
    // Handle authentication message
    extWs.on("message", (message) => {
      try {
        // Convert message buffer to string if needed
        const messageStr = message.toString();
        const data = JSON.parse(messageStr);
        
        // Handle authentication message
        if (data.type === "authenticate") {
          const { userId, role, managerId } = data;
          extWs.userId = userId;
          extWs.role = role;
          extWs.managerId = managerId;
          
          // Add connection to the map
          if (!wsConnections.has(userId)) {
            wsConnections.set(userId, []);
          }
          wsConnections.get(userId)?.push(extWs);
          
          // Send confirmation
          extWs.send(JSON.stringify({ 
            type: "authenticated", 
            message: "WebSocket connection authenticated" 
          }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    // Handle disconnection
    extWs.on("close", () => {
      if (extWs.userId) {
        const connections = wsConnections.get(extWs.userId);
        if (connections) {
          const index = connections.indexOf(extWs);
          if (index !== -1) {
            connections.splice(index, 1);
          }
          
          // Clean up empty connections
          if (connections.length === 0) {
            wsConnections.delete(extWs.userId);
          }
        }
      }
    });
  });
  
  // Setup WebSocket heartbeat
  setupWebSocketHeartbeat();

  // =================== HEALTH CHECK ROUTE ===================
  
  // Health check endpoint for monitoring
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // =================== ADMIN ROUTES ===================
  
  // Get all managers
  app.get("/api/managers", async (req, res, next) => {
    try {
      const managers = await storage.getAllManagers();
      const defaultUsers = await storage.getDefaultUsers();
      res.json([...managers, ...defaultUsers]);
    } catch (error) {
      next(error);
    }
  });

  // Add a new manager
  app.post("/api/managers", async (req, res, next) => {
    try {
      const managerData = insertUserSchema.parse({
        ...req.body,
        role: UserRole.MANAGER,
      });
      
      // Check if workId is already taken
      const existingUser = await storage.getUserByWorkId(managerData.workId);
      if (existingUser) {
        return res.status(400).json({ message: "Work ID already exists" });
      }

      // Hash the password if provided
      if (managerData.password) {
        managerData.password = await hashPassword(managerData.password);
      }

      const manager = await storage.createUser(managerData);
      res.status(201).json(manager);
    } catch (error) {
      next(error);
    }
  });

  // Remove a manager
  app.delete("/api/managers/:managerId", async (req, res, next) => {
    try {
      const managerId = parseInt(req.params.managerId);
      const manager = await storage.getUser(managerId);
      
      if (!manager) {
        return res.status(404).json({ message: "Manager not found" });
      }
      
      if (manager.role !== UserRole.MANAGER) {
        return res.status(400).json({ message: "User is not a manager" });
      }
      
      const success = await storage.deleteUser(managerId);
      if (success) {
        res.status(200).json({ message: "Manager deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete manager" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Get manager with their agents
  app.get("/api/managers/:managerId", async (req, res, next) => {
    try {
      const managerId = parseInt(req.params.managerId);
      const manager = await storage.getUser(managerId);
      
      if (!manager) {
        return res.status(404).json({ message: "Manager not found" });
      }
      
      if (manager.role !== UserRole.MANAGER) {
        return res.status(400).json({ message: "User is not a manager" });
      }
      
      const agents = await storage.getAllAgentsByManagerId(managerId);
      res.json({ manager, agents });
    } catch (error) {
      next(error);
    }
  });

  // Get help requests
  app.get("/api/help-requests", async (req, res, next) => {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const resolved = req.query.resolved === 'true';
      const helpRequests = await storage.getHelpRequests(resolved);
      res.json(helpRequests);
    } catch (error) {
      next(error);
    }
  });

  // Get all users (admin only)
  app.get("/api/users", async (req, res, next) => {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      next(error);
    }
  });

  // Resolve help request
  app.patch("/api/help-requests/:requestId/resolve", async (req, res, next) => {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.requestId);
      const helpRequest = await storage.resolveHelpRequest(requestId);
      
      if (!helpRequest) {
        return res.status(404).json({ message: "Help request not found" });
      }
      
      res.json(helpRequest);
    } catch (error) {
      next(error);
    }
  });

  // =================== MANAGER ROUTES ===================
  
  // Get all agents for the current manager
  app.get("/api/agents", async (req, res, next) => {
    try {
      // If admin is requesting all agents with the 'all' query parameter
      if (req.user?.role === UserRole.ADMIN && req.query.all === 'true') {
        const allAgents = await storage.getAllUsers();
        const agents = allAgents.filter(user => user.role === UserRole.AGENT);
        return res.json(agents);
      }

      // Standard behavior for managers - get their agents
      const managerId = req.user!.id;
      const agents = await storage.getAllAgentsByManagerId(managerId);
      res.json(agents);
    } catch (error) {
      next(error);
    }
  });

  // Post mark attendance with WebSocket notification
  app.post("/api/attendance", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.AGENT) {
        return res.status(403).json({ message: "Only agents can mark attendance" });
      }
      
      // Ensure the agent is marking their own attendance
      const userId = req.user!.id;
      
      // If userId is sent in request, validate it matches the logged-in user
      if (req.body.userId && req.body.userId !== userId) {
        return res.status(403).json({ message: "You can only mark your own attendance" });
      }
      
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Get the manager of this agent
      const agent = await storage.getUser(userId);
      if (!agent || !agent.managerId) {
        return res.status(400).json({ message: "Agent has no manager assigned" });
      }
      
      // Get attendance timeframe set by the manager
      const timeFrame = await storage.getAttendanceTimeFrameByManagerId(agent.managerId);
      const startTime = timeFrame ? timeFrame.startTime : "06:00";
      const endTime = timeFrame ? timeFrame.endTime : "09:00";
      
      // Convert times to comparable format (minutes since midnight)
      const convertTimeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const startMinutes = convertTimeToMinutes(startTime);
      const endMinutes = convertTimeToMinutes(endTime);
      const currentMinutes = convertTimeToMinutes(currentTime);
      
      // Check if current time is within the allowed timeframe
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return res.status(400).json({ 
          message: `Attendance can only be marked between ${startTime} and ${endTime}`,
          timeFrame: { startTime, endTime }
        });
      }
      
      // Check if already marked attendance today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingAttendance = await storage.getAttendanceByUserIdAndDate(
        userId, 
        today
      );
      
      if (existingAttendance) {
        return res.status(400).json({ 
          message: "Attendance already marked for today",
          attendance: existingAttendance
        });
      }
      
      // Validate sector and location fields
      const { sector, location } = req.body;
      
      if (!sector || typeof sector !== 'string' || sector.trim() === '') {
        return res.status(400).json({ message: "Insurance sector is required" });
      }
      
      if (!location || typeof location !== 'string' || location.trim() === '') {
        return res.status(400).json({ message: "Working location is required" });
      }
      
      const attendanceData = insertAttendanceSchema.parse({
        userId,
        date: now,
        sector,
        location
      });
      
      const attendance = await storage.markAttendance(attendanceData);
      
      // Notify manager about new attendance
      if (agent.managerId) {
        // Get agent data for notification
        const { firstName, lastName } = agent;
        
        // Send WebSocket notification to manager
        notifyManagerTeam(agent.managerId, {
          type: 'attendance_marked',
          data: {
            attendance,
            agentName: `${firstName} ${lastName}`,
            time: format(new Date(attendance.date), "h:mm a"),
            sector,
            location
          }
        });
      }
      
      res.status(201).json(attendance);
    } catch (error) {
      next(error);
    }
  });

  // Check today's attendance status for current user
  app.get("/api/attendance/status", async (req, res, next) => {
    try {
      // Determine which user's attendance to check - either from query param or the authenticated user
      let userId: number;
      
      // If a user ID is provided in the query and the requester is a manager or admin, use that ID
      if (req.query.userId && 
          (req.user!.role === UserRole.MANAGER || req.user!.role === UserRole.ADMIN)) {
        userId = parseInt(req.query.userId as string);
        
        // For managers, verify the requested user is their agent
        if (req.user!.role === UserRole.MANAGER) {
          const agent = await storage.getUser(userId);
          if (!agent || agent.managerId !== req.user!.id) {
            return res.status(403).json({ message: "You can only view your own agents' attendance" });
          }
        }
      } else {
        // Default to the requesting user's ID
        userId = req.user!.id;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendance = await storage.getAttendanceByUserIdAndDate(
        userId, 
        today
      );
      
      if (attendance) {
        res.json({ 
          marked: true, 
          time: format(new Date(attendance.date), "h:mm a"),
          attendance 
        });
      } else {
        res.json({ marked: false });
      }
    } catch (error) {
      next(error);
    }
  });

  // Add client
  app.post("/api/clients", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.AGENT) {
        return res.status(403).json({ message: "Only agents can add clients" });
      }
      
      const userId = req.user!.id;
      
      // If agentId is sent in request, validate it matches the logged-in user
      if (req.body.agentId && req.body.agentId !== userId) {
        return res.status(403).json({ message: "You can only add clients for yourself" });
      }
      
      // Check if attendance is marked for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendance = await storage.getAttendanceByUserIdAndDate(
        userId, 
        today
      );
      
      if (!attendance) {
        return res.status(400).json({ 
          message: "You must mark attendance before adding clients" 
        });
      }
      
      const clientData = insertClientSchema.parse({
        ...req.body,
        agentId: userId
      });
      
      const client = await storage.createClient(clientData);
      
      // Get agent information for notification
      const agent = await storage.getUser(userId);
      if (agent && agent.managerId) {
        // Send WebSocket notification to manager about new client
        notifyManagerTeam(agent.managerId, {
          type: 'client_added',
          data: {
            client,
            agentName: `${agent.firstName} ${agent.lastName}`,
            clientName: `${client.firstName} ${client.lastName}`
          }
        });
      }
      
      res.status(201).json(client);
    } catch (error) {
      next(error);
    }
  });

  // Get agent's clients
  app.get("/api/clients", async (req, res, next) => {
    try {
      // If agent, only return their clients
      if (req.user!.role === UserRole.AGENT) {
        const clients = await storage.getClientsByAgentId(req.user!.id);
        return res.json(clients);
      }
      
      // If manager, return clients for all their agents but with agent information included
      if (req.user!.role === UserRole.MANAGER) {
        const agents = await storage.getAllAgentsByManagerId(req.user!.id);
        const agentIds = agents.map(agent => agent.id);
        
        let allClients: any[] = [];
        // Create a map of agent names for easier reference
        const agentMap = new Map();
        agents.forEach(agent => {
          agentMap.set(agent.id, `${agent.firstName} ${agent.lastName}`);
        });
        
        for (const agentId of agentIds) {
          const agentClients = await storage.getClientsByAgentId(agentId);
          // Add agent information to each client
          const clientsWithAgentInfo = agentClients.map(client => ({
            ...client,
            agentName: agentMap.get(agentId) || `Agent #${agentId}`
          }));
          allClients = [...allClients, ...clientsWithAgentInfo];
        }
        
        return res.json(allClients);
      }
      
      // If admin, return all clients with agent information
      const clients = await storage.getAllClients();
      const allUsers = await storage.getAllUsers();
      const userMap = new Map();
      
      for (const user of allUsers) {
        userMap.set(user.id, `${user.firstName} ${user.lastName}`);
      }
      
      const clientsWithAgentInfo = clients.map(client => ({
        ...client,
        agentName: userMap.get(client.agentId) || `Agent #${client.agentId}`
      }));
      
      res.json(clientsWithAgentInfo);
    } catch (error) {
      next(error);
    }
  });

  // Get agent's manager info
  app.get("/api/manager-info", async (req, res, next) => {
    try {
      // Get the user's info to find their manager
      const agent = await storage.getUser(req.user!.id);
      if (!agent || !agent.managerId) {
        return res.status(400).json({ message: "User has no manager assigned" });
      }
      
      const manager = await storage.getUser(agent.managerId);
      if (!manager) {
        return res.status(404).json({ message: "Manager not found" });
      }
      
      // Get team leader if exists
      const agents = await storage.getAllAgentsByManagerId(manager.id);
      const teamLeader = agents.find(agent => agent.isLeader === true);
      
      // Return only necessary info
      const managerInfo = {
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`,
        email: manager.email,
        phoneNumber: manager.phoneNumber,
        teamLeader: teamLeader ? {
          id: teamLeader.id,
          name: `${teamLeader.firstName} ${teamLeader.lastName}`,
          email: teamLeader.email,
          phoneNumber: teamLeader.phoneNumber
        } : null
      };
      
      res.json(managerInfo);
    } catch (error) {
      next(error);
    }
  });

  // Create daily report
  app.post("/api/daily-reports", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.AGENT) {
        return res.status(403).json({ message: "Only agents can submit daily reports" });
      }
      
      const agentId = req.user!.id;
      
      // Get the agent's manager ID
      const agent = await storage.getUser(agentId);
      if (!agent || !agent.managerId) {
        return res.status(400).json({ message: "Agent has no manager assigned" });
      }
      
      // Get today's clients for the agent
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const clients = await storage.getClientsByAgentId(agentId);
      const todayClients = clients.filter(client => {
        const clientDate = new Date(client.createdAt);
        clientDate.setHours(0, 0, 0, 0);
        return clientDate.getTime() === today.getTime();
      });
      
      if (todayClients.length === 0) {
        return res.status(400).json({ message: "No clients added today to include in report" });
      }
      
      // Create the report
      const reportData = {
        agentId,
        date: new Date(),
        comment: req.body.comment,
        clientsData: JSON.stringify(todayClients)
      };
      
      const report = await storage.createDailyReport(reportData);
      
      // Notify the manager about the new report
      if (agent.managerId) {
        notifyUser(agent.managerId, {
          type: 'daily_report_submitted',
          data: {
            report,
            agentName: `${agent.firstName} ${agent.lastName}`,
            clientCount: todayClients.length
          }
        });
      }
      
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  });

  // Get agent's daily reports
  app.get("/api/daily-reports/agent", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.AGENT) {
        return res.status(403).json({ message: "Only agents can view their reports" });
      }
      
      const agentId = req.user!.id;
      const reports = await storage.getDailyReportsByAgentId(agentId);
      
      res.json(reports);
    } catch (error) {
      next(error);
    }
  });

  // Get daily reports for manager
  app.get("/api/daily-reports/manager", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.MANAGER && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Only managers can view team reports" });
      }
      
      const managerId = req.user!.id;
      
      let reports = [];
      if (req.query.date) {
        // Get reports for a specific date
        const date = new Date(req.query.date as string);
        reports = await storage.getDailyReportsByDate(date);
      } else if (req.query.startDate && req.query.endDate) {
        // Get reports for a date range
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);
        reports = await storage.getDailyReportsByDateRange(startDate, endDate);
      } else {
        // Default to today
        const today = new Date();
        reports = await storage.getDailyReportsByDate(today);
      }
      
      // If manager, filter to only show reports from their agents
      if (req.user!.role === UserRole.MANAGER) {
        const agents = await storage.getAllAgentsByManagerId(managerId);
        const agentIds = agents.map(agent => agent.id);
        reports = reports.filter(report => agentIds.includes(report.agentId));
      }
      
      // Enrich reports with agent information
      const allUsers = await storage.getAllUsers();
      const userMap = new Map();
      allUsers.forEach(user => {
        userMap.set(user.id, `${user.firstName} ${user.lastName}`);
      });
      
      const enrichedReports = reports.map(report => ({
        ...report,
        agentName: userMap.get(report.agentId) || `Agent #${report.agentId}`,
        clientsData: JSON.parse(report.clientsData)
      }));
      
      res.json(enrichedReports);
    } catch (error) {
      next(error);
    }
  });

  // Get performance reports for current agent
  app.get("/api/reports/performance", async (req, res, next) => {
    try {
      // Calculate appropriate statistics based on role
      const userId = req.query.userId 
        ? parseInt(req.query.userId as string) 
        : req.user!.id;
        
      // Make sure managers can only view reports for their agents
      if (req.user!.role === UserRole.MANAGER) {
        const agent = await storage.getUser(userId);
        if (!agent || agent.managerId !== req.user!.id) {
          return res.status(403).json({ 
            message: "You can only view reports for your agents" 
          });
        }
      }
      
      // Agent can only view their own reports
      if (req.user!.role === UserRole.AGENT && userId !== req.user!.id) {
        return res.status(403).json({ 
          message: "You can only view your own reports" 
        });
      }
      
      // Get the client count
      const clients = await storage.getClientsByAgentId(userId);
      
      // Get attendance count (simplified for demo)
      const attendanceList = Array.from((await storage.getAttendanceByDate(new Date()))
        .filter(a => a.userId === userId));
        
      const report = {
        totalClients: clients.length,
        recentClients: clients.slice(-5),  // Last 5 clients
        attendanceRate: attendanceList.length > 0 ? `${(attendanceList.length / 30 * 100).toFixed(1)}%` : "0%",
        averageResponseTime: clients.length > 0 ? "1.2h" : "0h",
        clientsThisMonth: clients.filter(c => new Date(c.createdAt).getMonth() === new Date().getMonth()).length
      };
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  // =================== MANAGER ATTENDANCE TIMEFRAME ROUTES ===================
  
  // Get attendance timeframe for manager
  app.get("/api/attendance-timeframe", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.MANAGER && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // If query parameter managerId is provided and requester is admin, get the timeframe for that manager
      let managerId = req.user!.id;
      if (req.query.managerId && req.user!.role === UserRole.ADMIN) {
        managerId = parseInt(req.query.managerId as string);
      }
      
      const timeFrame = await storage.getAttendanceTimeFrameByManagerId(managerId);
      if (!timeFrame) {
        return res.json({ 
          startTime: "06:00", // Default start time
          endTime: "09:00"    // Default end time
        });
      }
      
      res.json(timeFrame);
    } catch (error) {
      next(error);
    }
  });
  
  // Create/update attendance timeframe for manager with WebSocket notification
  app.post("/api/attendance-timeframe", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.MANAGER) {
        return res.status(403).json({ message: "Only managers can set attendance timeframes" });
      }
      
      const managerId = req.user!.id;
      
      // Validate the time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(req.body.startTime) || !timeRegex.test(req.body.endTime)) {
        return res.status(400).json({ message: "Invalid time format. Use HH:MM format in 24-hour time." });
      }
      
      // Check if the manager already has a timeframe
      const existingTimeFrame = await storage.getAttendanceTimeFrameByManagerId(managerId);
      
      let timeFrame;
      if (existingTimeFrame) {
        // Update existing timeframe
        timeFrame = await storage.updateAttendanceTimeFrame(
          existingTimeFrame.id,
          {
            startTime: req.body.startTime,
            endTime: req.body.endTime
          }
        );
      } else {
        // Create new timeframe
        timeFrame = await storage.createAttendanceTimeFrame({
          managerId,
          startTime: req.body.startTime,
          endTime: req.body.endTime
        });
      }

      // Notify all agents of this manager about the updated attendance timeframe
      const agents = await storage.getAllAgentsByManagerId(managerId);
      
      if (agents.length > 0) {
        // Get manager data for notification
        const manager = await storage.getUser(managerId);
        
        // Send WebSocket notification to all team members
        notifyManagerTeam(managerId, {
          type: 'attendance_timeframe_updated',
          data: {
            timeFrame,
            managerName: manager ? `${manager.firstName} ${manager.lastName}` : 'Your manager',
          }
        });
      }
      
      return res.status(existingTimeFrame ? 200 : 201).json(timeFrame);
    } catch (error) {
      next(error);
    }
  });
  
  // =================== AGENT ROUTES ===================
  
  // Add a new agent with WebSocket notification
  app.post("/api/agents", async (req, res, next) => {
    try {
      const managerId = req.user!.id;
      const agentData = insertUserSchema.parse({
        ...req.body,
        role: UserRole.AGENT,
        managerId,
      });
      
      // Check if workId or email is already taken
      const [existingWorkId, existingEmail] = await Promise.all([
        storage.getUserByWorkId(agentData.workId),
        storage.getUserByEmail(agentData.email)
      ]);
      
      if (existingWorkId) {
        return res.status(400).json({ message: "Work ID already exists" });
      }
      
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash the password if provided
      if (agentData.password) {
        agentData.password = await hashPassword(agentData.password);
      }

      const agent = await storage.createUser(agentData);
      
      // Notify manager team about new agent
      notifyManagerTeam(managerId, {
        type: 'agent_added',
        data: {
          agent,
          message: `New agent ${agent.firstName} ${agent.lastName} has been added`,
        }
      });
      
      // If admin is the one who created the user, notify them too
      if (req.user!.role === UserRole.ADMIN) {
        notifyByRole(UserRole.ADMIN, {
          type: 'user_created',
          data: {
            user: agent,
            message: `New ${agent.role} ${agent.firstName} ${agent.lastName} has been created`,
          }
        });
      }
      
      res.status(201).json(agent);
    } catch (error) {
      next(error);
    }
  });

  // Remove an agent
  app.delete("/api/agents/:agentId", async (req, res, next) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const agent = await storage.getUser(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      if (agent.role !== UserRole.AGENT) {
        return res.status(400).json({ message: "User is not an agent" });
      }
      
      // Make sure the agent belongs to the current manager
      if (agent.managerId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "You can only remove your own agents" });
      }
      
      const success = await storage.deleteUser(agentId);
      if (success) {
        res.status(200).json({ message: "Agent deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete agent" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Assign agent as leader
  app.post("/api/agents/:agentId/assign-leader", async (req, res, next) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const agent = await storage.getUser(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      if (agent.role !== UserRole.AGENT) {
        return res.status(400).json({ message: "User is not an agent" });
      }
      
      // Make sure the agent belongs to the current manager
      if (agent.managerId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "You can only assign your own agents as leader" });
      }
      
      try {
        const updatedAgent = await storage.assignAgentAsLeader(agentId);
        if (updatedAgent) {
          // Return the updated agent
          res.json(updatedAgent);
        } else {
          res.status(500).json({ message: "Failed to assign agent as leader" });
        }
      } catch (error) {
        console.error("Error assigning leader:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Get agent attendance reports
  app.get("/api/reports/attendance", async (req, res, next) => {
    try {
      if (req.user!.role === UserRole.AGENT) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const date = req.query.date 
        ? new Date(req.query.date as string) 
        : new Date();
        
      const attendanceRecords = await storage.getAttendanceByDate(date);
      
      // If manager, filter to only include their agents
      if (req.user!.role === UserRole.MANAGER) {
        try {
          const managerId = req.user!.id;
          const agents = await storage.getAllAgentsByManagerId(managerId);
          const agentIds = agents.map(agent => agent.id);
          
          // Create a map of agent IDs to names for easy lookup
          const agentMap = new Map();
          for (const agent of agents) {
            agentMap.set(agent.id, `${agent.firstName} ${agent.lastName}`);
          }
          
          // Filter attendance to manager's agents and add agent names
          const filteredAttendance = attendanceRecords
            .filter(a => agentIds.includes(a.userId))
            .map(record => ({
              ...record,
              agentName: agentMap.get(record.userId) || `Agent #${record.userId}`
            }));
          
          return res.json(filteredAttendance);
        } catch (error) {
          console.error("Error fetching attendance:", error);
          return res.json([]);
        }
      }
      
      // For admin, get all user names
      if (req.user!.role === UserRole.ADMIN) {
        const allUsers = await storage.getAllUsers();
        const userMap = new Map();
        
        for (const user of allUsers) {
          userMap.set(user.id, `${user.firstName} ${user.lastName}`);
        }
        
        const enrichedAttendance = attendanceRecords.map(record => ({
          ...record,
          agentName: userMap.get(record.userId) || `Agent #${record.userId}`
        }));
        
        return res.json(enrichedAttendance);
      }
      
      res.json(attendanceRecords);
    } catch (error) {
      next(error);
    }
  });

  // Get attendance timeframe for agents (uses their manager's timeframe)
  app.get("/api/attendance-timeframe/agent", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get the agent's manager ID
      const agent = await storage.getUser(req.user.id);
      if (!agent || !agent.managerId) {
        return res.status(400).json({ message: "Agent has no manager assigned" });
      }
      
      // Get attendance timeframe set by the agent's manager
      const timeFrame = await storage.getAttendanceTimeFrameByManagerId(agent.managerId);
      if (!timeFrame) {
        return res.json({ 
          startTime: "06:00", // Default start time
          endTime: "09:00"    // Default end time
        });
      }
      
      res.json(timeFrame);
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}
