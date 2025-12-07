# AgencyFlow - Task Management Application

## Overview

AgencyFlow is a task management and project tracking application. It uses React with TypeScript for the frontend and an Express backend with an external PostgreSQL database for data persistence and authentication.

## Architecture

### Frontend (React)
- Located in `src/` directory
- Uses React Router DOM for routing
- TanStack React Query for server state management
- Shadcn/UI component library with TailwindCSS
- Drag-and-drop functionality with @dnd-kit

### Backend (Express)
- Express server in `server/` directory
- JWT-based authentication (implemented in `server/auth.ts` and `src/lib/auth.ts`)
- RESTful API routes in `server/routes.ts`
- Email notifications via `server/email.ts`
- Serves the Vite-bundled frontend
- Role-based access control (Admin/Staff)

### Database
- External PostgreSQL database
- Uses Drizzle ORM for schema definitions in `shared/schema.ts`
- Connection via `EXTERNAL_DATABASE_URL` environment variable
- Database connection configured in `server/db.ts`

## Key Files

- `src/App.tsx` - Main application router and layout
- `src/lib/auth.ts` - Frontend authentication utilities (getAuthHeaders, useAuth hook)
- `src/components/AppSidebar.tsx` - Navigation sidebar
- `src/components/TaskDialog.tsx` - Task details with comments feature
- `src/pages/` - Page components (Dashboard, Projects, Team, Calendar, etc.)
- `server/index.ts` - Express server entry point
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Database storage interface
- `server/auth.ts` - JWT authentication middleware
- `server/email.ts` - Email notification service
- `server/db.ts` - Database connection
- `shared/schema.ts` - Database schema (Drizzle ORM)
- `vite.config.ts` - Vite configuration

## Environment Variables

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

## API Authentication Pattern

All authenticated API calls use the `getAuthHeaders()` function:
```typescript
import { getAuthHeaders, useAuth } from "@/lib/auth";

const response = await fetch("/api/endpoint", {
  headers: getAuthHeaders(),
});
```

## Running the Application

The application starts via the "Start application" workflow which runs `npm run dev`. This starts the Express server on port 5000 which serves both the API and the Vite-bundled frontend.

## Key Features

### Comments System
- Tasks support comments with activity logging
- Latest comment displays at top of task dialog
- Full comment history accessible via "See Logs" button
- Comments show author, content, and timestamp

### Calendar View
- Project-specific calendar views for task scheduling
- Tasks load via `/api/projects/:projectId/tasks` endpoint

### Staff Security
- Backend enforces role-based visibility
- Staff users only see assigned tasks and projects
- Server-side filtering prevents unauthorized data access

### Performance
- Server-side filtering for efficient data loading
- Optimized queries for task and project retrieval

## User Preferences

- External PostgreSQL database for data persistence
- JWT-based authentication
- React Router DOM for routing
- Shadcn/UI design system
- Drag-and-drop Kanban board for task management
