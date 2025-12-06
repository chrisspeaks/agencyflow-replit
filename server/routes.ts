import { Router } from "express";
import { storage } from "./storage";

const router = Router();

// Auth mock endpoints (simplified - in production use proper auth)
router.get("/api/auth/user", (req, res) => {
  // Mock auth - in real app, verify JWT token
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ id: userId });
});

// Profiles
router.get("/api/profiles", async (req, res) => {
  try {
    const profiles = await storage.getAllProfiles();
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/profiles/:id", async (req, res) => {
  try {
    const profile = await storage.getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/profiles/:id", async (req, res) => {
  try {
    const updated = await storage.updateProfile(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Projects
router.get("/api/projects", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const roles = userId ? await storage.getUserRoles(userId) : [];
    
    let projects;
    if (roles.includes("admin") || roles.includes("manager")) {
      projects = await storage.getAllProjects();
    } else if (userId) {
      projects = await storage.getProjectsByUserId(userId);
    } else {
      projects = [];
    }
    
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/projects", async (req, res) => {
  try {
    const project = await storage.createProject(req.body);
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/projects/:id", async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/projects/:id", async (req, res) => {
  try {
    const updated = await storage.updateProject(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Project Members
router.get("/api/projects/:projectId/members", async (req, res) => {
  try {
    const memberIds = await storage.getProjectMembers(req.params.projectId);
    res.json(memberIds);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/projects/:projectId/members", async (req, res) => {
  try {
    await storage.addProjectMember({
      projectId: req.params.projectId,
      userId: req.body.userId,
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/projects/:projectId/members/:userId", async (req, res) => {
  try {
    await storage.removeProjectMember(req.params.projectId, req.params.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tasks
router.get("/api/tasks", async (req, res) => {
  try {
    const { projectId, assigneeId } = req.query;
    let tasks;
    
    if (projectId) {
      tasks = await storage.getTasksByProject(projectId as string);
    } else if (assigneeId) {
      tasks = await storage.getTasksByAssignee(assigneeId as string);
    } else {
      tasks = [];
    }
    
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/tasks", async (req, res) => {
  try {
    const task = await storage.createTask(req.body);
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/tasks/:id", async (req, res) => {
  try {
    const task = await storage.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/tasks/:id", async (req, res) => {
  try {
    const updated = await storage.updateTask(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications
router.get("/api/notifications", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const notifications = await storage.getUserNotifications(userId);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/notifications", async (req, res) => {
  try {
    await storage.createNotification(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await storage.markNotificationRead(req.params.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
