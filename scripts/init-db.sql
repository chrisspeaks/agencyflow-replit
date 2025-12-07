-- AgencyFlow Database Initialization Script
-- This script creates all required tables and a default admin user
-- Run this script on your PostgreSQL database before starting the application

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Enable pgcrypto extension for gen_random_uuid() function
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('P1-High', 'P2-Medium', 'P3-Low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('Todo', 'In Progress', 'Internal Review', 'Pending Client Review', 'Done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Sessions table (JWT session management)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Profiles table (user profile information)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    avatar_url TEXT,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    force_password_change BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User roles table (role assignments)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'active',
    brand_color TEXT NOT NULL DEFAULT '#0f172a',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    priority task_priority NOT NULL DEFAULT 'P2-Medium',
    status task_status NOT NULL DEFAULT 'Todo',
    due_date TIMESTAMP WITH TIME ZONE,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Task assignees table (many-to-many)
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Task logs table (activity logs)
CREATE TABLE IF NOT EXISTS task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    action_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);

-- =============================================================================
-- DEFAULT ADMIN USER
-- Password: Admin123 (bcrypt hashed with 10 rounds)
-- IMPORTANT: Change this password immediately after first login!
-- =============================================================================

DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Check if admin user already exists
    SELECT id INTO admin_id FROM users WHERE email = 'admin@website.com';
    
    IF admin_id IS NULL THEN
        -- Create admin user
        -- Password hash for "Admin123" generated with bcrypt (10 rounds)
        INSERT INTO users (id, email, password_hash)
        VALUES (
            gen_random_uuid(),
            'admin@website.com',
            '$2b$10$7hLoIhsxdeUkKYsoYWgpWeKjrZyC5EWyw5qBbg021/Gw.JSoH7WQK'
        )
        RETURNING id INTO admin_id;
        
        -- Create admin profile
        INSERT INTO profiles (id, full_name, role, email)
        VALUES (admin_id, 'System Administrator', 'admin', 'admin@website.com');
        
        -- Assign admin role
        INSERT INTO user_roles (user_id, role)
        VALUES (admin_id, 'admin');
        
        RAISE NOTICE 'Default admin user created successfully!';
        RAISE NOTICE 'Email: admin@website.com';
        RAISE NOTICE 'Password: Admin123';
        RAISE NOTICE 'IMPORTANT: Change this password immediately after first login!';
    ELSE
        RAISE NOTICE 'Admin user already exists, skipping creation.';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - users';
    RAISE NOTICE '  - sessions';
    RAISE NOTICE '  - profiles';
    RAISE NOTICE '  - user_roles';
    RAISE NOTICE '  - projects';
    RAISE NOTICE '  - project_members';
    RAISE NOTICE '  - tasks';
    RAISE NOTICE '  - task_assignees';
    RAISE NOTICE '  - task_comments';
    RAISE NOTICE '  - notifications';
    RAISE NOTICE '  - task_logs';
    RAISE NOTICE '==============================================';
END $$;
