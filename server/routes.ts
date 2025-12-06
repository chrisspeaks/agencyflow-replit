import { Router } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth";

const router = Router();

router.get("/api/user/role", requireAuth, async (req, res) => {
  try {
    const roles = await storage.getUserRoles(req.user!.id);
    const role = roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : roles[0] || null;
    res.json({ role, roles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/profiles", requireAuth, async (req, res) => {
  try {
    const profiles = await storage.getAllProfiles();
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/profiles/:id", requireAuth, async (req, res) => {
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

router.patch("/api/profiles/:id", requireAuth, async (req, res) => {
  try {
    if (req.user!.id !== req.params.id && !req.user!.roles.includes("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const updated = await storage.updateProfile(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/projects", requireAuth, async (req, res) => {
  try {
    const roles = await storage.getUserRoles(req.user!.id);
    
    let projects;
    if (roles.includes("admin") || roles.includes("manager") || req.user!.profile?.role === "admin" || req.user!.profile?.role === "manager") {
      projects = await storage.getAllProjects();
    } else {
      projects = await storage.getProjectsByUserId(req.user!.id);
    }
    
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/projects", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  try {
    const project = await storage.createProject(req.body);
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/projects/:id", requireAuth, async (req, res) => {
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

router.patch("/api/projects/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
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

router.get("/api/projects/:projectId/members", requireAuth, async (req, res) => {
  try {
    const memberIds = await storage.getProjectMembers(req.params.projectId);
    const profiles = await Promise.all(
      memberIds.map(async (userId) => {
        const profile = await storage.getProfile(userId);
        return {
          user_id: userId,
          full_name: profile?.fullName || profile?.email || "Unknown",
          email: profile?.email || "",
        };
      })
    );
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/projects/:projectId/members", requireAuth, requireRole("admin", "manager"), async (req, res) => {
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

router.delete("/api/projects/:projectId/members/:userId", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  try {
    await storage.removeProjectMember(req.params.projectId, req.params.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/tasks", requireAuth, async (req, res) => {
  try {
    const { projectId, assigneeId } = req.query;
    let tasks;
    
    if (projectId) {
      tasks = await storage.getTasksByProject(projectId as string);
    } else if (assigneeId) {
      tasks = await storage.getTasksByAssignee(assigneeId as string);
    } else {
      tasks = await storage.getTasksByAssignee(req.user!.id);
    }
    
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/tasks", requireAuth, async (req, res) => {
  try {
    const task = await storage.createTask({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/tasks/:id", requireAuth, async (req, res) => {
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

router.patch("/api/tasks/:id", requireAuth, async (req, res) => {
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

router.get("/api/tasks/:taskId/assignees", requireAuth, async (req, res) => {
  try {
    const assignees = await storage.getTaskAssignees(req.params.taskId);
    res.json(assignees.map(userId => ({ user_id: userId })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/tasks/:taskId/assignees", requireAuth, async (req, res) => {
  try {
    const { userIds } = req.body;
    for (const userId of userIds) {
      await storage.addTaskAssignee({
        taskId: req.params.taskId,
        userId,
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/tasks/:taskId/assignees/:userId", requireAuth, async (req, res) => {
  try {
    await storage.removeTaskAssignee(req.params.taskId, req.params.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await storage.getUserNotifications(req.user!.id);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/notifications", requireAuth, async (req, res) => {
  try {
    await storage.createNotification(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await storage.markNotificationRead(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/tasks/:taskId/comments", requireAuth, async (req, res) => {
  try {
    const comments = await storage.getTaskComments(req.params.taskId);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/tasks/:taskId/comments", requireAuth, async (req, res) => {
  try {
    await storage.createTaskComment({
      taskId: req.params.taskId,
      userId: req.user!.id,
      content: req.body.content,
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/tasks/:taskId/logs", requireAuth, async (req, res) => {
  try {
    const logs = await storage.getTaskLogs(req.params.taskId);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
