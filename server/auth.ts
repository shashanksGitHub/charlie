import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Create a middleware for checking authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Create a middleware for session touch (keeping session alive)
export const touchSession = (req: Request, res: Response, next: NextFunction) => {
  if (req.session) {
    // Touch the session to prevent premature expiration
    req.session.touch();
  }
  next();
};

export function setupAuth(app: Express) {
  // SIMPLIFIED SESSION CONFIG - NO TRUST PROXY ISSUES
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "charley-app-secret-key-fixed",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false,
      httpOnly: true,
      sameSite: "lax"
    },
    name: 'connect.sid'
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Add a global touchSession middleware to keep session alive on all requests
  app.use((req, res, next) => touchSession(req, res, next));

  // Create a simple in-memory cache for authenticated users (lasts for duration of server)
  const userLoginCache = new Map();
  
  // Cache expiration (5 minutes)
  const CACHE_TTL = 5 * 60 * 1000;
  
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          // Check cache first for quick authentication
          const cacheKey = `${email}:${password}`;
          const cachedUser = userLoginCache.get(cacheKey);
          
          if (cachedUser && cachedUser.expiry > Date.now()) {
            return done(null, cachedUser.user);
          }
          
          // Optimize lookup strategy - perform concurrent lookups
          const [emailUser, usernameUser, phoneUser] = await Promise.all([
            storage.getUserByEmail(email).catch(() => null),
            storage.getUserByUsername(email).catch(() => null),
            storage.getUserByPhoneNumber(email).catch(() => null)
          ]);
          
          // Find the first non-null user
          const user = emailUser || usernameUser || phoneUser;
          
          if (!user) {
            return done(null, false);
          }
          
          // Check if user is suspended
          if (user.isSuspended) {
            // Check if suspension has expired
            if (user.suspensionExpiresAt && new Date() > user.suspensionExpiresAt) {
              // Suspension expired, automatically unsuspend
              await storage.updateUserProfile(user.id, {
                isSuspended: false,
                suspendedAt: null,
                suspensionExpiresAt: null
              });
              console.log(`🔓 User ${user.id} suspension expired, automatically unsuspended`);
            } else {
              // Still suspended, but allow login - user will see suspended interface in app
              console.log(`⚠️ Suspended user ${user.username} (ID: ${user.id}) logged in - will see suspension interface`);
            }
          }
          
          // Password validation with enhanced error logging for debugging
          console.log(`🔍 Attempting authentication for user: ${user.username} (ID: ${user.id})`);
          console.log(`🔑 Stored password format: ${user.password?.substring(0, 20)}...`);
          const passwordValid = await comparePasswords(password, user.password);
          
          if (!passwordValid) {
            console.log(`❌ Authentication failed for user: ${user.username} (ID: ${user.id})`);
            console.log(`📝 Password provided: ${password}`);
            return done(null, false);
          }
          
          // Cache the successful authentication
          userLoginCache.set(cacheKey, {
            user,
            expiry: Date.now() + CACHE_TTL
          });
          
          // Log only the final success, not the intermediate steps
          console.log("Authentication successful for user:", user.id);
          return done(null, user);
        } catch (error) {
          console.error("Authentication error:", error);
          return done(error);
        }
      }
    ),
  );

  // 🚀 PERFORMANCE FIX: User cache to eliminate repeated database queries
  const userDeserializeCache = new Map<number, { user: any; expiry: number }>();
  const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  passport.serializeUser((user, done) => {
    console.log(`[AUTH-SERIALIZE] Serializing user ID: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    console.log(`[AUTH-DESERIALIZE] Attempting to deserialize user ID: ${id}`);
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`[AUTH-DESERIALIZE] User not found for ID: ${id}`);
        return done(null, false);
      }
      
      console.log(`[AUTH-DESERIALIZE] Successfully fetched user ${id}: ${user.username}`);
      done(null, user);
    } catch (error) {
      console.error(`[AUTH-DESERIALIZE] Error deserializing user ${id}:`, error);
      done(null, false);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // PERFORMANCE OPTIMIZATION: Run existence checks in parallel
      const existenceChecks = [];
      
      if (req.body.phoneNumber) {
        existenceChecks.push(
          storage.getUserByPhoneNumber(req.body.phoneNumber).then(user => ({ type: 'phone', user }))
        );
      }
      
      if (req.body.email) {
        // Normalize email to lowercase for consistent duplicate checking
        const normalizedEmail = req.body.email.trim().toLowerCase();
        req.body.email = normalizedEmail; // Update the body with normalized email
        
        // Check email uniqueness across multiple sources
        existenceChecks.push(
          storage.getUserByEmail(normalizedEmail).then(user => ({ type: 'email' as const, user, source: 'users' as const }))
        );
        
        // CRITICAL: Also check if email exists in blocked phone numbers table
        existenceChecks.push(
          storage.isEmailInBlockedPhoneNumbers(normalizedEmail).then(blockedRecord => ({ 
            type: 'email' as const, 
            user: blockedRecord, 
            source: 'blocked_phones' as const
          }))
        );
      }
      
      // Wait for all existence checks to complete in parallel
      if (existenceChecks.length > 0) {
        const results = await Promise.all(existenceChecks);
        
        for (const result of results) {
          if (result.user && (!req.isAuthenticated() || req.user.id !== result.user.id)) {
            let errorMessage = '';
            
            if (result.type === 'phone') {
              errorMessage = 'Phone number already in use by another account';
            } else if (result.type === 'email') {
              if ((result as any).source === 'blocked_phones') {
                // Email was found in blocked phone numbers - provide specific guidance
                errorMessage = 'This email is associated with a blocked account. Please use a different email address or contact support if you believe this is an error.';
                console.log(`[EMAIL-UNIQUENESS] Blocked email duplicate attempt: ${req.body.email} (found in blocked phone numbers table)`);
              } else {
                // Email found in regular users table
                errorMessage = 'Email already registered with another account. Please use a different email or sign in with your existing account.';
                console.log(`[EMAIL-UNIQUENESS] Active email duplicate attempt: ${req.body.email} (found in users table)`);
              }
            }
            
            // Log duplicate account creation attempts for security monitoring
            console.log(`[DUPLICATE-ACCOUNT-PREVENTION] Blocked ${result.type} duplicate from ${(result as any).source}: ${result.type === 'phone' ? req.body.phoneNumber : req.body.email}`);
            
            return res.status(400).send(errorMessage);
          }
        }
      }
      
      // Generate a username based on name or email if not provided
      if (!req.body.username) {
        if (req.body.fullName) {
          // Generate username from full name (remove spaces, add random number)
          req.body.username = req.body.fullName.replace(/\s+/g, '') + Math.floor(Math.random() * 10000);
        } else if (req.body.email) {
          // Generate from email
          req.body.username = req.body.email.split('@')[0] + Math.floor(Math.random() * 10000);
        } else {
          // Generate random username
          req.body.username = 'user_' + Math.floor(Math.random() * 1000000);
        }
      }

      // Create a new user with all the profile data
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        verifiedByPhone: req.body.phoneNumber ? true : false,
      });

      // PERFORMANCE OPTIMIZATION: Run photo uploads in parallel
      const photoPromises = [];
      
      if (user.photoUrl) {
        photoPromises.push(
          storage.addUserPhoto({
            userId: user.id,
            photoUrl: user.photoUrl,
            isPrimary: true
          }).catch(photoError => {
            console.error("Error adding primary user photo during registration:", photoError);
            return null; // Don't fail the registration
          })
        );
      }
      
      if (req.body.photoUrl2) {
        photoPromises.push(
          storage.addUserPhoto({
            userId: user.id,
            photoUrl: req.body.photoUrl2,
            isPrimary: false
          }).catch(photoError => {
            console.error("Error adding secondary user photo during registration:", photoError);
            return null; // Don't fail the registration
          })
        );
      }
      
      // Wait for all photo uploads to complete in parallel (non-blocking)
      if (photoPromises.length > 0) {
        await Promise.all(photoPromises);
      }

      // PERFORMANCE OPTIMIZATION: Streamlined session handling
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Set up persistent session efficiently
        if (req.session && req.session.cookie) {
          req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
        }
        
        // Don't send password in response
        const { password, ...userWithoutPassword } = user;
        console.log(`New user ${user.id} registered with persistent session`);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Authenticate using passport's local strategy
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Manually handle login to set persistent session
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Explicitly save the session with persistent flag
        if (req.session) {
          req.session.touch();
          
          // Set the cookie's maxAge to a long period (1 year) for persistence
          if (req.session.cookie) {
            req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
          }
          
          // Force session save to ensure persistence
          req.session.save(async (saveErr) => {
            if (saveErr) {
              console.error("Session save error:", saveErr);
            }
            try {
              // Fetch the latest user from the database
              const freshUser = await storage.getUser(user.id);
              if (!freshUser) {
                return res.status(404).json({ message: "User not found" });
              }
              const { password, ...userWithoutPassword } = freshUser;
              console.log(`User ${user.id} logged in with persistent session (fresh DB fetch)`);
            res.status(200).json(userWithoutPassword);
            } catch (dbErr) {
              console.error("DB fetch error after login:", dbErr);
              res.status(500).json({ message: "Failed to fetch user after login" });
            }
          });
        } else {
          // Fallback if no session is available
          const { password, ...userWithoutPassword } = user;
          res.status(200).json(userWithoutPassword);
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    console.log(`[API-USER] Request received, sessionID: ${req.sessionID}, session exists: ${!!req.session}`);
    console.log(`[API-USER] req.user: ${req.user ? `User ID ${req.user.id}` : 'null'}`);
    console.log(`[API-USER] req.isAuthenticated(): ${req.isAuthenticated()}`);
    console.log(`[API-USER] Session passport: ${(req.session as any)?.passport ? JSON.stringify((req.session as any).passport) : 'none'}`);
    
    if (!req.isAuthenticated()) {
      console.log("User authentication check failed");
      return res.status(401).json({ message: "Unauthorized", status: "login_required" });
    }
    
    const userId = req.user!.id;
    
    try {
      // Fetch fresh user data to check suspension status
      const freshUser = await storage.getUser(userId);
      if (!freshUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user is suspended
      if (freshUser.isSuspended) {
        // Check if suspension has expired
        if (freshUser.suspensionExpiresAt && new Date() > freshUser.suspensionExpiresAt) {
          // Suspension expired, automatically unsuspend
          await storage.updateUserProfile(userId, {
            isSuspended: false,
            suspendedAt: null,
            suspensionExpiresAt: null
          });
          console.log(`🔓 User ${userId} suspension expired, automatically unsuspended`);
        } else {
          // Still suspended, but return user data - frontend will show suspension interface
          console.log(`⚠️ Suspended user ${freshUser.username} (ID: ${userId}) accessing app - will see suspension interface`);
        }
      }
      
      // Reset session expiration to keep session alive
      if (req.session) {
        req.session.touch();
      }
      
      // Don't send password in response
      const { password, ...userWithoutPassword } = freshUser;
      console.log("User authenticated successfully, ID:", userId);
      res.json(userWithoutPassword);
      
    } catch (error) {
      console.error("Error checking user status:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Profile activation endpoint for MEET app
  app.post("/api/user/activate-profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Profile activation failed - user not authenticated");
      return res.status(401).json({ message: "Unauthorized", status: "login_required" });
    }

    try {
      const userId = req.user!.id;
      
      // Update user's profileHidden status to false AND set hasActivatedProfile to true
      // This automatically disables the "Hide MEET Profile" toggle when user activates their profile
      // Also enable Show Photo toggle automatically for better user experience
      const updatedUser = await storage.updateUser(userId, {
        profileHidden: false,
        hasActivatedProfile: true,
        showProfilePhoto: true
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`MEET profile activated for user ${userId} - privacy toggle disabled and photo visibility enabled automatically`);
      
      // Don't send password in response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Profile activation error:", error);
      res.status(500).json({ message: "Failed to activate profile" });
    }
  });
}
