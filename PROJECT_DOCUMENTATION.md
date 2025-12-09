# AgencyFlow - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Email Notifications](#email-notifications)
5. [Task Management](#task-management)
6. [Project Management](#project-management)
7. [User Approval Workflow](#user-approval-workflow)
8. [Dashboard Features](#dashboard-features)
9. [Email Configuration](#email-configuration)
10. [Customizing Email Templates](#customizing-email-templates)

---

## Overview

AgencyFlow is a comprehensive task and project management system designed for agencies. It features role-based access control, email notifications, multiple assignees per task, and an approval workflow for new users.

---

## Features

### Core Features
- ✅ **Multi-user task assignment** - Assign multiple team members to a single task
- ✅ **Email notifications** - Automated emails for task and project changes
- ✅ **Overdue task indicators** - Visual red borders and badges for overdue tasks
- ✅ **Role-based access control** - Admin, Manager, and Staff roles with different permissions
- ✅ **User approval workflow** - New users must be approved by admins before accessing the system
- ✅ **Project-based filtering** - Staff users only see projects they're assigned to
- ✅ **Kanban board** - Drag-and-drop task management with status columns
- ✅ **Calendar view** - Visualize tasks by due date
- ✅ **Task comments** - Add internal notes to tasks

---

## User Roles & Permissions

### Admin
- **Full system access**
- Can view and manage all projects and tasks
- Can approve/deactivate user accounts
- Can create projects
- Can manage user roles
- Can add/remove team members from any project
- Can assign tasks to any project member

### Manager
- Can view and manage projects they are assigned to
- Can create new projects
- Can add/remove team members from their projects
- Can create and assign tasks within their projects
- Cannot manage user accounts or roles

### Staff
- Can view projects they are assigned to
- **Cannot create new projects** (Create Project button is hidden)
- Can create tasks within projects they're assigned to
- Can only view and work on tasks in their projects
- Dashboard shows only their projects and tasks

---

## Email Notifications

The system sends automatic email notifications for the following events:

### Task Assignment Changes
**When**: A user is assigned to a task (new or existing)
**Recipient**: Newly assigned user
**Email includes**:
- Task title
- Project name
- Priority level
- Due date (if set)
- Link prompt to log in and view details

**When**: A user is unassigned from a task
**Recipient**: Unassigned user
**Email includes**:
- Task title
- Project name
- Notification that they're no longer responsible

### Project Member Changes
**When**: A user is added to a project team
**Recipient**: Added team member
**Email includes**:
- Project name
- Welcome message
- List of capabilities (view tasks, collaborate, track progress)

**When**: A user is removed from a project team
**Recipient**: Removed team member
**Email includes**:
- Project name
- Notification that access has been removed

---

## Task Management

### Creating Tasks
1. Navigate to a project
2. Click "New Task" button
3. Fill in task details:
   - **Title** (required)
   - **Description** (optional)
   - **Comments** (optional) - Internal notes about the task
   - **Status** - Todo, In Progress, Internal Review, Done
   - **Priority** - P1-High, P2-Medium, P3-Low
   - **Assign To** - Select multiple team members by checking boxes
   - **Due Date** (optional)
   - **Is Blocked** - Toggle if task is blocked

### Editing Tasks
1. Click on any task card
2. Edit any field
3. When changing assignees:
   - Adding assignees = sends assignment emails
   - Removing assignees = sends unassignment emails

### Multiple Assignees
- Tasks support multiple assignees
- Check/uncheck team members in the "Assign To" section
- All assignees receive email notifications
- When editing a task, existing assignees are pre-selected

### Overdue Tasks
Tasks past their due date (and not marked "Done") display:
- **Red border** around the card
- **Red background shading** (destructive/5 opacity)
- **"OVERDUE" badge** in red
- **Red due date text** instead of gray

### Task Comments
- Add internal notes that won't be visible in the main description
- Displayed with an italic style and speech bubble icon
- Useful for:
  - Progress updates
  - Blocking reasons
  - Internal notes
  - Quick status updates

---

## Project Management

### Creating Projects (Admin/Manager Only)
1. Go to Projects page
2. Click "New Project" (staff users won't see this button)
3. Enter project details:
   - Name
   - Description
   - Brand color
   - Status

### Adding Team Members
1. Open a project
2. Click "Team Members" button
3. Select users from the dropdown
4. Click the add button
5. **Automatic email sent** to added members

### Removing Team Members
1. Open "Team Members" dialog
2. Click the X button next to a member's name
3. Confirm removal
4. **Automatic email sent** to removed members

### Project Visibility Rules
- **Admins**: See all projects
- **Managers**: See all projects they're assigned to
- **Staff**: See only projects they're members of
- **Dashboard stats**: Filtered by user's accessible projects

---

## User Approval Workflow

### New User Sign Up
1. User creates an account via the Sign Up form
2. Account is created with **is_active = false**
3. User sees message: "Your account is pending approval by an administrator"
4. User **cannot log in** until approved

### Admin Approval Process
1. Admin logs into the system
2. Navigates to **Admin Dashboard**
3. Views the "User Management" section
4. Sees all users with their status (Active/Inactive)
5. Clicks **"Activate"** button next to pending user
6. User can now log in

### Deactivating Users
1. Admin goes to Admin Dashboard
2. Clicks **"Deactivate"** button next to active user
3. User is immediately logged out
4. User cannot log in again until reactivated

### What Happens When Inactive User Tries to Log In
- Automatically logged out if they have an active session
- Redirected to login page with error message
- Message: "Your account is pending approval. Please contact an administrator."

---

## Dashboard Features

### Statistics Cards
The dashboard shows three main metrics:

**Active Projects**
- **Admin/Manager**: Count of all active projects
- **Staff**: Count of active projects they're assigned to

**Pending Tasks**
- **Admin/Manager**: All tasks not marked "Done"
- **Staff**: Tasks from their projects that aren't "Done"

**Overdue Tasks**
- **Admin/Manager**: All overdue tasks system-wide
- **Staff**: Overdue tasks from their projects only
- Displayed with **red styling** to draw attention

---

## Email Configuration

### SMTP Settings
The system uses nodemailer with SMTP for sending emails from the Express backend. Required environment variables:

- `SMTP_HOST` - Your SMTP server hostname
- `SMTP_PORT` - SMTP port (default: 465 for SSL)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASSWORD` - SMTP password (stored as secret)

### Setting Up Email
1. Set SMTP environment variables in your deployment environment
2. For Replit: Add them in the Secrets tab
3. For Docker: Pass them as environment variables
4. For production: Configure in your deployment platform

### Email Service (Backend)
Email sending is handled by `server/email.ts` using nodemailer:

1. **sendNotificationEmail** - General notifications
   - Triggered when in-app notifications are created
   - Sends email with title and message

2. **sendTaskAssignmentEmail** - Task assignments
   - Handles both assignment and unassignment emails
   - Triggered from task assignee routes
   - Supports "assigned" and "unassigned" actions

3. **sendProjectMemberEmail** - Project member changes
   - Handles project member additions and removals
   - Triggered from project member routes
   - Supports "added" and "removed" actions

---

## Customizing Email Templates

### Email templates location
**File**: `server/email.ts`

All email templates are in the `server/email.ts` file. Edit the HTML strings in each function:

- `sendTaskAssignmentEmail` - Task assignment/unassignment templates
- `sendProjectMemberEmail` - Project member add/remove templates
- `sendNotificationEmail` - General notification template

### Email Styling Tips
- Use inline styles (email clients don't support external CSS well)
- Keep layouts simple (tables work best for complex layouts)
- Use web-safe fonts: Arial, Helvetica, Times New Roman, Courier
- Test emails in multiple clients (Gmail, Outlook, Apple Mail)
- Use `max-width: 600px` for optimal mobile viewing
- Brand colors can be adjusted by changing hex codes in styles

### Customizable Elements
You can customize:
- **Subject lines** - Edit the `subject` variable
- **Body HTML** - Edit the `body` variable
- **Colors** - Change hex codes in style attributes
- **Branding** - Update company name ("AgencyFlow Team")
- **Content** - Add/remove sections as needed
- **Call-to-action buttons** - Add links to specific pages

### After Customizing
1. Save the email template file
2. Restart the server to apply changes
3. Test by triggering the relevant action (assign task, add member, etc.)
4. Check server logs for any errors

---

## Additional Configuration

### Security Settings
- **Password Protection**: Passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Enforced at API route level

### Database Access
- **Admin Dashboard**: Manage users and roles
- **Database Tools**: Use standard PostgreSQL tools for direct database access
- **SQL Editor**: Run custom queries if needed

### Future Enhancements
Consider adding:
- Real-time notifications via websockets
- File attachments on tasks
- Time tracking
- Gantt chart view
- Custom fields per project
- Slack/Discord integrations
- Mobile app

---

## Troubleshooting

### Emails Not Sending
1. Check SMTP secrets are correctly configured
2. View server logs for email errors
3. Verify SMTP credentials with your email provider
4. Check spam folder
5. Ensure port 465 is not blocked by firewall

### User Can't Access After Approval
1. Verify `is_active = true` in profiles table
2. Ask user to log out and back in
3. Check user role is assigned in user_roles table

### Tasks Not Showing Overdue Styling
1. Verify task has a due_date set
2. Check task status is not "Done"
3. Ensure due_date is in the past
4. Clear browser cache

### Dashboard Stats Not Updating
1. Refresh the page
2. Check user is assigned to projects
3. Verify user has proper role permissions

---

## Support & Documentation

For additional help:
- Review server logs for debugging
- Check the PostgreSQL documentation for database queries
- Contact your system administrator for access issues

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Application**: AgencyFlow Task Management System
