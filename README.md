# Task Management Application

A comprehensive task management and project tracking application built with React, TypeScript, and Supabase.

## Features

- User authentication (login/signup)
- Project management with team collaboration
- Kanban-style task boards with drag-and-drop
- Calendar view for task scheduling
- Team member management
- Notifications system
- Admin dashboard

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Shadcn/UI
- **State Management**: TanStack React Query
- **Routing**: React Router DOM
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Styling**: TailwindCSS with custom design system

## Development

The application runs on port 5000. Use the "Start application" workflow to launch the development server.

### Environment Variables

The following environment variables are required:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── integrations/   # Third-party integrations (Supabase)
├── lib/            # Utility functions
└── config/         # App configuration
server/             # Express backend server
shared/             # Shared types and schemas
supabase/           # Supabase functions and migrations
```
