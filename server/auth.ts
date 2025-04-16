import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { UserRole, User, loginSchema, helpRequestSchema } from "@shared/schema";
import { storage } from "./storage";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";

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
        const user = await storage.getUserByWorkIdAndEmail(workId, email);
        
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        // If user has no password set, allow login without password
        if (!user.password) {
          return done(null, user);
        }
        
        // If user has a password set but none provided
        if (!password) {
          return done(null, false, { message: "Password required" });
        }
        
        try {
          // Compare passwords securely
          const passwordMatches = await comparePasswords(password, user.password);
          if (!passwordMatches) {
            return done(null, false, { message: "Invalid password" });
          }
        } catch (error) {
          console.error("Password comparison error:", error);
          return done(null, false, { message: "Authentication error" });
        }

        return done(null, user);
      } catch (error) {
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

  // Login route
  app.post("/api/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

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
