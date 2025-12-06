import { pgTable, uuid, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "staff"]);
export const appRoleEnum = pgEnum("app_role", ["admin", "manager", "staff"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived", "completed"]);
export const taskPriorityEnum = pgEnum("task_priority", ["P1-High", "P2-Medium", "P3-Low"]);
export const taskStatusEnum = pgEnum("task_status", ["Todo", "In Progress", "Internal Review", "Pending Client Review", "Done"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("staff"),
  avatarUrl: text("avatar_url"),
  email: text("email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: appRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("active"),
  brandColor: text("brand_color").notNull().default("#0f172a"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  assigneeId: uuid("assignee_id").references(() => profiles.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => profiles.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: taskPriorityEnum("priority").notNull().default("P2-Medium"),
  status: taskStatusEnum("status").notNull().default("Todo"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  isBlocked: boolean("is_blocked").notNull().default(false),
  comments: text("comments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskAssignees = pgTable("task_assignees", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskLogs = pgTable("task_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  actionType: text("action_type").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const insertTaskAssigneeSchema = createInsertSchema(taskAssignees).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertTaskAssignee = z.infer<typeof insertTaskAssigneeSchema>;
export type TaskAssignee = typeof taskAssignees.$inferSelect;

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const insertTaskLogSchema = createInsertSchema(taskLogs).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertTaskLog = z.infer<typeof insertTaskLogSchema>;
export type TaskLog = typeof taskLogs.$inferSelect;
