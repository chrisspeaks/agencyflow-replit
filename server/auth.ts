import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { eq, and, gt } from "drizzle-orm";
import * as schema from "../shared/schema";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRY = "7d";
const SALT_ROUNDS = 10;

export interface AuthUser {
  id: string;
  email: string;
  profile?: {
    id: string;
    fullName: string;
    role: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next();
  }

  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.userId));
    if (!user) {
      return next();
    }

    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, user.id));
    const userRoles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id));

    req.user = {
      id: user.id,
      email: user.email,
      profile: profile ? {
        id: profile.id,
        fullName: profile.fullName,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
        isActive: profile.isActive,
      } : undefined,
      roles: userRoles.map(r => r.role),
    };
  } catch (error) {
    console.error("Auth middleware error:", error);
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const hasRole = roles.some(role => 
      req.user!.roles.includes(role) || req.user!.profile?.role === role
    );
    
    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

router.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Email, password, and full name are required" });
    }

    const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db.insert(schema.users).values({
      email,
      passwordHash,
    }).returning();

    await db.insert(schema.profiles).values({
      id: user.id,
      email,
      fullName,
      role: "staff",
      isActive: false,
    });

    res.json({ 
      message: "Registration successful. Your account is pending approval.",
      userId: user.id 
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, user.id));
    if (!profile?.isActive) {
      return res.status(403).json({ error: "Your account is not active. Please contact an administrator." });
    }

    const token = generateToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(schema.sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const userRoles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id));

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: profile ? {
          id: profile.id,
          fullName: profile.fullName,
          role: profile.role,
          avatarUrl: profile.avatarUrl,
          isActive: profile.isActive,
          forcePasswordChange: profile.forcePasswordChange,
        } : null,
        roles: userRoles.map(r => r.role),
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/auth/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (token) {
      await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
    }

    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    res.json({ user: req.user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.user!.id));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.update(schema.users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, req.user!.id));

    await db.update(schema.profiles)
      .set({ forcePasswordChange: false, updatedAt: new Date() })
      .where(eq(schema.profiles.id, req.user!.id));

    res.json({ message: "Password changed successfully" });
  } catch (error: any) {
    console.error("Change password error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/users", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Email, password, and full name are required" });
    }

    const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db.insert(schema.users).values({
      email,
      passwordHash,
    }).returning();

    await db.insert(schema.profiles).values({
      id: user.id,
      email,
      fullName,
      role: role || "staff",
      isActive: true,
      forcePasswordChange: true,
    });

    if (role) {
      await db.insert(schema.userRoles).values({
        userId: user.id,
        role: role as any,
      });
    }

    res.json({ 
      message: "User created successfully",
      userId: user.id 
    });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/reset-password", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: "User ID and new password are required" });
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    await db.update(schema.profiles)
      .set({ forcePasswordChange: true, updatedAt: new Date() })
      .where(eq(schema.profiles.id, userId));

    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));

    res.json({ message: "Password reset successfully" });
  } catch (error: any) {
    console.error("Admin reset password error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/admin/users/:id/activate", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;

    await db.update(schema.profiles)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.profiles.id, req.params.id));

    res.json({ message: isActive ? "User activated" : "User deactivated" });
  } catch (error: any) {
    console.error("Admin activate user error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/admin/users/:id/role", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { role } = req.body;

    await db.update(schema.profiles)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(schema.profiles.id, req.params.id));

    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, req.params.id));
    await db.insert(schema.userRoles).values({
      userId: req.params.id,
      role: role as any,
    });

    res.json({ message: "User role updated" });
  } catch (error: any) {
    console.error("Admin update role error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
