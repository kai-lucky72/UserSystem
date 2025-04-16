import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { UserRole, insertUserSchema, insertAttendanceSchema, insertClientSchema } from "@shared/schema";
import { format } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes (/api/login, /api/logout, /api/user)
  setupAuth(app);

  // =================== ADMIN ROUTES ===================
  
  // Get all managers
  app.get("/api/managers", async (req, res, next) => {
    try {
      const managers = await storage.getAllManagers();
      res.json(managers);
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
      const managerId = req.user!.id;
      const agents = await storage.getAllAgentsByManagerId(managerId);
      res.json(agents);
    } catch (error) {
      next(error);
    }
  });

  // Add a new agent
  app.post("/api/agents", async (req, res, next) => {
    try {
      const managerId = req.user!.id;
      const agentData = insertUserSchema.parse({
        ...req.body,
        role: UserRole.AGENT,
        managerId,
      });
      
      // Check if workId is already taken
      const existingUser = await storage.getUserByWorkId(agentData.workId);
      if (existingUser) {
        return res.status(400).json({ message: "Work ID already exists" });
      }

      // Hash the password if provided
      if (agentData.password) {
        agentData.password = await hashPassword(agentData.password);
      }

      const agent = await storage.createUser(agentData);
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
      
      const updatedAgent = await storage.assignAgentAsLeader(agentId);
      if (updatedAgent) {
        res.json(updatedAgent);
      } else {
        res.status(500).json({ message: "Failed to assign agent as leader" });
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
        
      const attendance = await storage.getAttendanceByDate(date);
      
      // If manager, filter to only include their agents
      if (req.user!.role === UserRole.MANAGER) {
        const managerId = req.user!.id;
        const agents = await storage.getAllAgentsByManagerId(managerId);
        const agentIds = agents.map(agent => agent.id);
        
        const filteredAttendance = attendance.filter(a => 
          agentIds.includes(a.userId)
        );
        
        return res.json(filteredAttendance);
      }
      
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  });
  
  // =================== AGENT ROUTES ===================
  
  // Mark attendance
  app.post("/api/attendance", async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.AGENT) {
        return res.status(403).json({ message: "Only agents can mark attendance" });
      }
      
      const now = new Date();
      const hours = now.getHours();
      
      // Check if time is between 6:00 AM and 9:00 AM
      if (hours < 6 || hours >= 9) {
        return res.status(400).json({ 
          message: "Attendance can only be marked between 6:00 AM and 9:00 AM"
        });
      }
      
      // Check if already marked attendance today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingAttendance = await storage.getAttendanceByUserIdAndDate(
        req.user!.id, 
        today
      );
      
      if (existingAttendance) {
        return res.status(400).json({ 
          message: "Attendance already marked for today",
          attendance: existingAttendance
        });
      }
      
      const attendanceData = insertAttendanceSchema.parse({
        userId: req.user!.id,
        date: now
      });
      
      const attendance = await storage.markAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      next(error);
    }
  });

  // Check today's attendance status for current user
  app.get("/api/attendance/status", async (req, res, next) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendance = await storage.getAttendanceByUserIdAndDate(
        req.user!.id, 
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
      
      // Check if attendance is marked for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendance = await storage.getAttendanceByUserIdAndDate(
        req.user!.id, 
        today
      );
      
      if (!attendance) {
        return res.status(400).json({ 
          message: "You must mark attendance before adding clients" 
        });
      }
      
      const clientData = insertClientSchema.parse({
        ...req.body,
        agentId: req.user!.id
      });
      
      const client = await storage.createClient(clientData);
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
      
      // If manager, return clients for all their agents
      if (req.user!.role === UserRole.MANAGER) {
        const agents = await storage.getAllAgentsByManagerId(req.user!.id);
        const agentIds = agents.map(agent => agent.id);
        
        let allClients: any[] = [];
        for (const agentId of agentIds) {
          const clients = await storage.getClientsByAgentId(agentId);
          allClients = [...allClients, ...clients];
        }
        
        return res.json(allClients);
      }
      
      // If admin, return all clients
      const clients = await storage.getAllClients();
      res.json(clients);
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
        attendanceRate: "94%", // Simplified
        averageResponseTime: "1.2h", // Simplified
      };
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
