# AgencyFlow - Task Management Application

A comprehensive task management and project tracking application built with React, TypeScript, and Express with PostgreSQL.

## Features

- User authentication with JWT tokens (login/signup)
- Project management with team collaboration
- Kanban-style task boards with drag-and-drop functionality
- Calendar view for task scheduling and due date management
- Task comments with activity logging ("See Logs" for comment history)
- Team member management with role-based access (Admin/Staff)
- Email notifications system
- Admin dashboard
- Staff visibility security (backend-enforced task/project filtering)

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Shadcn/UI
- **State Management**: TanStack React Query
- **Routing**: React Router DOM
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication
- **Styling**: TailwindCSS with custom design system
- **Drag & Drop**: @dnd-kit library

## Development

The application runs on port 5000. Use the "Start application" workflow to launch the development server.

### Environment Variables

Required environment variables (set in Replit Secrets):

**Database:**
- `EXTERNAL_DATABASE_URL` - PostgreSQL connection string (or `DATABASE_URL`)

**Authentication:**
- `JWT_SECRET` - Secret for JWT token signing

**Email Notifications (optional):**
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (default: 465)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components (Dashboard, Projects, Team, etc.)
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and authentication
└── config/         # App configuration
server/
├── index.ts        # Express server entry point
├── routes.ts       # API route definitions
├── storage.ts      # Database storage interface
├── db.ts           # Database connection
├── auth.ts         # JWT authentication middleware
├── email.ts        # Email notification service
└── vite.ts         # Vite dev server integration
shared/
└── schema.ts       # Database schema (Drizzle ORM)
```

## Recent Changes

### Comments Feature
- Latest comment displays prominently at the top of the comments section
- Shows author name, content, and timestamp
- Previous comments accessible via "See Logs" button for full history

### Calendar View
- Fixed task loading for project-specific calendar views
- Tasks properly load when viewing calendar for individual projects

### Staff Security
- Backend enforces visibility rules for staff users
- Staff members only see tasks and projects they are assigned to
- Server-side filtering prevents data leaks

### Performance Optimizations
- Server-side filtering for tasks and projects
- Optimized queries to reduce unnecessary data transfer
