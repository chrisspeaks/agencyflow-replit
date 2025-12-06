import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import type {
  InsertProfile,
  Profile,
  InsertProject,
  Project,
  InsertTask,
  Task,
  InsertProjectMember,
  InsertUserRole,
  InsertNotification,
  InsertTaskAssignee,
  InsertTaskComment,
  InsertTaskLog,
} from "../shared/schema";

export interface IStorage {
  // Profiles
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  getAllProfiles(): Promise<Profile[]>;
  createProfile(profile: InsertProfile & { id: string }): Promise<Profile>;
  updateProfile(id: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;

  // User Roles
  getUserRoles(userId: string): Promise<string[]>;
  addUserRole(data: InsertUserRole): Promise<void>;
  removeUserRole(userId: string, role: string): Promise<void>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;

  // Project Members
  getProjectMembers(projectId: string): Promise<string[]>;
  addProjectMember(data: InsertProjectMember): Promise<void>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;
  getUserProjects(userId: string): Promise<string[]>;

  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTasksByAssignee(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;

  // Task Assignees
  getTaskAssignees(taskId: string): Promise<string[]>;
  addTaskAssignee(data: InsertTaskAssignee): Promise<void>;
  removeTaskAssignee(taskId: string, userId: string): Promise<void>;

  // Notifications
  getUserNotifications(userId: string): Promise<any[]>;
  createNotification(notification: InsertNotification): Promise<void>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;
  clearAllNotifications(userId: string): Promise<void>;

  // Task Comments
  getTaskComments(taskId: string): Promise<any[]>;
  createTaskComment(comment: InsertTaskComment): Promise<void>;

  // Task Logs
  getTaskLogs(taskId: string): Promise<any[]>;
  createTaskLog(log: InsertTaskLog): Promise<void>;
}

export class PostgresStorage implements IStorage {
  async getProfile(id: string) {
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, id));
    return profile;
  }

  async getProfileByEmail(email: string) {
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.email, email));
    return profile;
  }

  async getAllProfiles() {
    return db.select().from(schema.profiles);
  }

  async createProfile(profile: InsertProfile & { id: string }) {
    const [created] = await db.insert(schema.profiles).values(profile).returning();
    return created;
  }

  async updateProfile(id: string, data: Partial<InsertProfile>) {
    const [updated] = await db.update(schema.profiles).set(data).where(eq(schema.profiles.id, id)).returning();
    return updated;
  }

  async getUserRoles(userId: string) {
    const roles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    return roles.map(r => r.role);
  }

  async addUserRole(data: InsertUserRole) {
    await db.insert(schema.userRoles).values(data).onConflictDoNothing();
  }

  async removeUserRole(userId: string, role: string) {
    await db.delete(schema.userRoles).where(
      and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.role, role as any))
    );
  }

  async getProject(id: string) {
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
    return project;
  }

  async getAllProjects() {
    return db.select().from(schema.projects).orderBy(desc(schema.projects.createdAt));
  }

  async getProjectsByUserId(userId: string) {
    const memberProjects = await db
      .select({ project: schema.projects })
      .from(schema.projectMembers)
      .innerJoin(schema.projects, eq(schema.projectMembers.projectId, schema.projects.id))
      .where(eq(schema.projectMembers.userId, userId));
    return memberProjects.map(mp => mp.project);
  }

  async createProject(project: InsertProject) {
    const [created] = await db.insert(schema.projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, data: Partial<InsertProject>) {
    const [updated] = await db.update(schema.projects).set(data).where(eq(schema.projects.id, id)).returning();
    return updated;
  }

  async getProjectMembers(projectId: string) {
    const members = await db.select().from(schema.projectMembers).where(eq(schema.projectMembers.projectId, projectId));
    return members.map(m => m.userId);
  }

  async addProjectMember(data: InsertProjectMember) {
    await db.insert(schema.projectMembers).values(data).onConflictDoNothing();
  }

  async removeProjectMember(projectId: string, userId: string) {
    await db.delete(schema.projectMembers).where(
      and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId))
    );
  }

  async getUserProjects(userId: string) {
    const projects = await db.select().from(schema.projectMembers).where(eq(schema.projectMembers.userId, userId));
    return projects.map(p => p.projectId);
  }

  async getTask(id: string) {
    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
    return task;
  }

  async getTasksByProject(projectId: string) {
    return db.select().from(schema.tasks).where(eq(schema.tasks.projectId, projectId)).orderBy(desc(schema.tasks.createdAt));
  }

  async getTasksByAssignee(userId: string) {
    const taskAssignments = await db
      .select({ taskId: schema.taskAssignees.taskId })
      .from(schema.taskAssignees)
      .where(eq(schema.taskAssignees.userId, userId));
    
    if (taskAssignments.length === 0) {
      return [];
    }
    
    const taskIds = taskAssignments.map(ta => ta.taskId);
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(inArray(schema.tasks.id, taskIds))
      .orderBy(desc(schema.tasks.createdAt));
    
    const tasksWithProject = await Promise.all(
      tasks.map(async (task) => {
        const project = await this.getProject(task.projectId);
        return {
          ...task,
          projectName: project?.name,
          projectColor: project?.brandColor,
        };
      })
    );
    
    return tasksWithProject;
  }

  async createTask(task: InsertTask) {
    const [created] = await db.insert(schema.tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, data: Partial<InsertTask>) {
    const [updated] = await db.update(schema.tasks).set(data).where(eq(schema.tasks.id, id)).returning();
    return updated;
  }

  async getTaskAssignees(taskId: string) {
    const assignees = await db.select().from(schema.taskAssignees).where(eq(schema.taskAssignees.taskId, taskId));
    return assignees.map(a => a.userId);
  }

  async addTaskAssignee(data: InsertTaskAssignee) {
    await db.insert(schema.taskAssignees).values(data).onConflictDoNothing();
  }

  async removeTaskAssignee(taskId: string, userId: string) {
    await db.delete(schema.taskAssignees).where(
      and(eq(schema.taskAssignees.taskId, taskId), eq(schema.taskAssignees.userId, userId))
    );
  }

  async getUserNotifications(userId: string) {
    return db.select().from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notification: InsertNotification) {
    await db.insert(schema.notifications).values(notification);
  }

  async markNotificationRead(id: string, userId: string) {
    await db.update(schema.notifications)
      .set({ isRead: true })
      .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, userId)));
  }

  async deleteNotification(id: string, userId: string) {
    await db.delete(schema.notifications)
      .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, userId)));
  }

  async clearAllNotifications(userId: string) {
    await db.delete(schema.notifications)
      .where(eq(schema.notifications.userId, userId));
  }

  async getTaskComments(taskId: string) {
    return db.select().from(schema.taskComments)
      .where(eq(schema.taskComments.taskId, taskId))
      .orderBy(schema.taskComments.createdAt);
  }

  async createTaskComment(comment: InsertTaskComment) {
    await db.insert(schema.taskComments).values(comment);
  }

  async getTaskLogs(taskId: string) {
    return db.select().from(schema.taskLogs)
      .where(eq(schema.taskLogs.taskId, taskId))
      .orderBy(desc(schema.taskLogs.createdAt));
  }

  async createTaskLog(log: InsertTaskLog) {
    await db.insert(schema.taskLogs).values(log);
  }
}

export const storage = new PostgresStorage();
