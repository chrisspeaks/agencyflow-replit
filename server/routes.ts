import { Router } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth";
import { sendNotificationEmail, sendTaskAssignmentEmail, sendProjectMemberEmail } from "./email";

const router = Router();

router.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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
    const project = await storage.getProject(req.params.projectId);
    const profile = await storage.getProfile(req.body.userId);
    
    await storage.addProjectMember({
      projectId: req.params.projectId,
      userId: req.body.userId,
    });
    
    if (profile?.email && project) {
      sendProjectMemberEmail({
        memberEmail: profile.email,
        memberName: profile.fullName || profile.email,
        projectName: project.name,
        action: "added",
      }).catch(err => console.error("Project member email error:", err));
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/projects/:projectId/members/:userId", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  try {
    const project = await storage.getProject(req.params.projectId);
    const profile = await storage.getProfile(req.params.userId);
    
    await storage.removeProjectMember(req.params.projectId, req.params.userId);
    
    if (profile?.email && project) {
      sendProjectMemberEmail({
        memberEmail: profile.email,
        memberName: profile.fullName || profile.email,
        projectName: project.name,
        action: "removed",
      }).catch(err => console.error("Project member removal email error:", err));
    }
    
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
    const body = req.body;
    const projectId = body.project_id || body.projectId;
    const title = body.title;
    
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    const rawDueDate = body.due_date || body.dueDate || null;
    let dueDate: Date | null = null;
    if (rawDueDate) {
      dueDate = new Date(rawDueDate);
      if (isNaN(dueDate.getTime())) {
        dueDate = null;
      }
    }
    
    const taskData = {
      projectId,
      title,
      description: body.description || null,
      priority: body.priority || "P2-Medium",
      status: body.status || "Todo",
      dueDate,
      isBlocked: body.is_blocked !== undefined ? body.is_blocked : (body.isBlocked || false),
      comments: body.comments || null,
      createdBy: req.user!.id,
    };
    const task = await storage.createTask(taskData);
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
    const body = req.body;
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.comments !== undefined) updateData.comments = body.comments;
    if (body.due_date !== undefined || body.dueDate !== undefined) {
      const rawDueDate = body.due_date || body.dueDate;
      if (rawDueDate) {
        const parsedDate = new Date(rawDueDate);
        updateData.dueDate = isNaN(parsedDate.getTime()) ? null : parsedDate;
      } else {
        updateData.dueDate = null;
      }
    }
    if (body.is_blocked !== undefined || body.isBlocked !== undefined) {
      updateData.isBlocked = body.is_blocked !== undefined ? body.is_blocked : body.isBlocked;
    }
    
    const updated = await storage.updateTask(req.params.id, updateData);
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
    const task = await storage.getTask(req.params.taskId);
    let projectName = "Project";
    if (task?.projectId) {
      const project = await storage.getProject(task.projectId);
      projectName = project?.name || "Project";
    }
    
    for (const userId of userIds) {
      await storage.addTaskAssignee({
        taskId: req.params.taskId,
        userId,
      });
      
      const profile = await storage.getProfile(userId);
      if (profile?.email && task) {
        sendTaskAssignmentEmail({
          taskTitle: task.title,
          assigneeEmail: profile.email,
          assigneeName: profile.fullName || profile.email,
          projectName,
          dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
          priority: task.priority || "medium",
          action: "assigned",
        }).catch(err => console.error("Task assignment email error:", err));
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/tasks/:taskId/assignees/:userId", requireAuth, async (req, res) => {
  try {
    const task = await storage.getTask(req.params.taskId);
    const profile = await storage.getProfile(req.params.userId);
    
    await storage.removeTaskAssignee(req.params.taskId, req.params.userId);
    
    if (profile?.email && task) {
      let projectName = "Project";
      if (task.projectId) {
        const project = await storage.getProject(task.projectId);
        projectName = project?.name || "Project";
      }
      sendTaskAssignmentEmail({
        taskTitle: task.title,
        assigneeEmail: profile.email,
        assigneeName: profile.fullName || profile.email,
        projectName,
        priority: task.priority || "medium",
        action: "unassigned",
      }).catch(err => console.error("Task unassignment email error:", err));
    }
    
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
    const { userId, title, message, type, link } = req.body;
    await storage.createNotification(req.body);
    
    if (userId && title) {
      try {
        const profile = await storage.getProfile(userId);
        if (profile?.email) {
          sendNotificationEmail({
            email: profile.email,
            name: profile.fullName || profile.email,
            title: title || "Notification",
            message: message || "",
            link,
          }).catch(err => console.error("Email notification error:", err));
        }
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
      }
    }
    
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

router.delete("/api/notifications/:id", requireAuth, async (req, res) => {
  try {
    await storage.deleteNotification(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/notifications", requireAuth, async (req, res) => {
  try {
    await storage.clearAllNotifications(req.user!.id);
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
    const logsWithUserNames = await Promise.all(
      logs.map(async (log: any) => {
        const profile = await storage.getProfile(log.userId);
        return {
          ...log,
          userName: profile?.fullName || profile?.email || "Unknown",
        };
      })
    );
    res.json(logsWithUserNames);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
