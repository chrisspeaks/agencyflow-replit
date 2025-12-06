# Task Management Application

## Overview

This is a task management and project tracking application migrated from Lovable to Replit. It uses React with TypeScript for the frontend and Supabase for authentication, database, and serverless functions.

## Architecture

### Frontend (React)
- Located in `src/` directory
- Uses React Router DOM for routing
- TanStack React Query for server state management
- Shadcn/UI component library with TailwindCSS
- Drag-and-drop functionality with @dnd-kit

### Backend
- Express server in `server/` directory (serves the Vite frontend)
- Supabase handles auth, database, and edge functions
- Edge functions located in `supabase/functions/`

### Database
- Supabase PostgreSQL database
- Migrations in `supabase/migrations/`
- Uses Drizzle ORM for schema definitions in `shared/schema.ts`

## Key Files

- `src/App.tsx` - Main application router and layout
- `src/integrations/supabase/client.ts` - Supabase client configuration
- `src/components/AppSidebar.tsx` - Navigation sidebar
- `src/pages/` - Page components (Dashboard, Projects, Team, etc.)
- `server/index.js` - Express server entry point
- `vite.config.ts` - Vite configuration

## Environment Variables

Required environment variables (set in Replit Secrets):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Running the Application

The application starts via the "Start application" workflow which runs `npm run dev`. This starts the Express server on port 5000 which serves both the API and the Vite-bundled frontend.

## User Preferences

- Uses Supabase for all backend functionality
- React Router DOM for routing (migrated from Lovable)
- Shadcn/UI design system
