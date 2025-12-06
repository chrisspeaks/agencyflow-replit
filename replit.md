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
- JWT-based authentication (implemented in `src/lib/auth.ts`)
- RESTful API routes in `server/routes.ts`
- Serves the Vite-bundled frontend

### Database
- External PostgreSQL database
- Uses Drizzle ORM for schema definitions in `shared/schema.ts`
- Connection via `EXTERNAL_DATABASE_URL` environment variable

## Key Files

- `src/App.tsx` - Main application router and layout
- `src/lib/auth.ts` - Authentication utilities (getAuthHeaders, useAuth hook)
- `src/components/AppSidebar.tsx` - Navigation sidebar
- `src/pages/` - Page components (Dashboard, Projects, Team, etc.)
- `server/index.js` - Express server entry point
- `server/routes.ts` - API route definitions
- `shared/schema.ts` - Database schema (Drizzle ORM)
- `vite.config.ts` - Vite configuration

## Environment Variables

Required environment variables (set in Replit Secrets):
- `EXTERNAL_DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing

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

## User Preferences

- External PostgreSQL database for data persistence
- JWT-based authentication
- React Router DOM for routing
- Shadcn/UI design system
- Drag-and-drop Kanban board for task management
