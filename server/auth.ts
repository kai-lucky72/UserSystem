import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { UserRole, User, loginSchema, helpRequestSchema } from "@shared/schema";
import { storage } from "./storage";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import debug from "debug";

const scryptAsync = promisify(scrypt);

// Hash a password with a random salt
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare the supplied password with the stored hashed password
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;

  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
  
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

declare global {
  namespace Express {
    // Define a User interface with the properties we need
    interface User {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      workId: string;
      nationalId: string;
      phoneNumber: string;
      password: string | null;
      role: string;
      managerId: number | null;
      isLeader: boolean | null;
    }
  }
}

export function setupAuth(app: Express) {
  // Debug middleware - remove in production
  app.use((req, res, next) => {
    debug(`${req.method} ${req.url}`);
    next();
  });
  
  // Add cache control headers to prevent browsers from caching user-specific data
  app.use((req, res, next) => {
    // Add cache control headers to prevent caching of user-specific data
    if (req.path.includes('/api/') && (
        req.path.includes('/attendance') || 
        req.path.includes('/clients') || 
        req.path.includes('/user')
      )) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "team-management-system-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport to use custom local strategy
  passport.use(new LocalStrategy(
    {
      usernameField: "workId",
      passwordField: "password",
      passReqToCallback: true
    },
    async (req, workId, password, done) => {
      try {
        const email = req.body.email;
        
        // Validate email is present
        if (!email) {
          console.log('Email is missing from request');
          return done(null, false, { message: "Email is required" });
        }
        
        console.log(`Authenticating: workId=${workId}, email=${email}, hasPassword=${!!password}`);
        
        // Find the user by workId and email
        const user = await storage.getUserByWorkIdAndEmail(workId, email);
        
        // If no user found, authentication fails
        if (!user) {
          console.log('No user found with the provided credentials');
          return done(null, false, { message: "Invalid credentials" });
        }
        
        console.log(`Found user: ${user.firstName} ${user.lastName} (${user.role}), hasPassword=${!!user.password}`);
        
        // If user has no password set, allow login without password
        if (!user.password) {
          console.log('User has no password, allowing login');
          return done(null, user);
        }
        
        // If user has a password but none provided, authentication fails
        if (!password) {
          console.log('Password required but not provided');
          return done(null, false, { message: "Password is required for this account" });
        }
        
        // Compare passwords
        try {
          const passwordMatches = await comparePasswords(password, user.password);
          
          if (!passwordMatches) {
            console.log('Password does not match');
            return done(null, false, { message: "Invalid password" });
          }
          
          console.log('Password verified successfully');
          return done(null, user);
        } catch (error) {
          console.error('Error comparing passwords:', error);
          return done(null, false, { message: "Authentication error" });
        }
      } catch (error) {
        console.error('Unexpected authentication error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Use a custom authentication function instead of passport.authenticate in login route
  const customAuthenticate = async (req: any, res: any, next: any) => {
    // Log the raw request for debugging
    console.log('Raw login request body:', JSON.stringify(req.body));
    
    // Ensure we have the required fields
    if (!req.body.workId || !req.body.email) {
      return res.status(401).json({ message: "Work ID and email are required" });
    }

    // Clean up password field
    req.body.password = req.body.password || "";
    
    // Log the processed request
    console.log('Processed login request:', {
      workId: req.body.workId,
      email: req.body.email,
      hasPassword: !!req.body.password
    });

    // Validate input using schema
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    // Find the user
    const user = await storage.getUserByWorkIdAndEmail(req.body.workId, req.body.email);
    
    if (!user) {
      console.log('No user found with the provided credentials');
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.role}), hasPassword=${!!user.password}`);
    
    // If user has no password, allow login
    if (!user.password) {
      console.log('User has no password, allowing login');
      return finishLogin(req, res, next, user);
    }
    
    // If user has a password but none provided, authentication fails
    if (!req.body.password) {
      console.log('Password required but not provided');
      return res.status(401).json({ message: "Password is required for this account" });
    }
    
    // Compare passwords
    try {
      const passwordMatches = await comparePasswords(req.body.password, user.password);
      
      if (!passwordMatches) {
        console.log('Password does not match');
        return res.status(401).json({ message: "Invalid password" });
      }
      
      console.log('Password verified successfully');
      return finishLogin(req, res, next, user);
    } catch (error) {
      console.error('Error comparing passwords:', error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };
  
  // Helper to finish the login process
  const finishLogin = (req: any, res: any, next: any, user: User) => {
    req.login(user, (loginErr: any) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return next(loginErr);
      }
      console.log('User authenticated successfully:', user.id, user.role);
      return res.status(200).json(user);
    });
  };
  
  // Login route
  app.post("/api/login", customAuthenticate);

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Help request route
  app.post("/api/help-request", async (req, res, next) => {
    try {
      const result = helpRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ errors: result.error.issues });
      }

      const helpRequest = await storage.createHelpRequest(result.data);
      res.status(201).json(helpRequest);
    } catch (error) {
      next(error);
    }
  });

  // Middleware to check for admin role
  app.use(["/api/admin", "/api/managers"], (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Access denied. Requires admin privileges." });
    }
    
    next();
  });

  // Middleware to check for manager role
  app.use("/api/agents", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Access denied. Requires manager privileges." });
    }
    
    next();
  });
}
