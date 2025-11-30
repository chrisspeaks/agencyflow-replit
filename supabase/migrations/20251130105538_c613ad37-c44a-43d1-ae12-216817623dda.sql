-- CRITICAL SECURITY FIX: Move roles to separate table
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles (convert via text)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update profiles table policies to use new role system
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update projects policies
DROP POLICY IF EXISTS "Admins and managers can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and managers can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

CREATE POLICY "Admins and managers can insert projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  (is_project_member(auth.uid(), id) AND public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update tasks policies
DROP POLICY IF EXISTS "Admins and managers can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers can update all tasks" ON public.tasks;

CREATE POLICY "Admins and managers can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  (is_project_member(auth.uid(), project_id) AND public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins and managers can update all tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  (is_project_member(auth.uid(), project_id) AND public.has_role(auth.uid(), 'manager'))
);

-- Update project_members policies
DROP POLICY IF EXISTS "Admins and managers can manage project members" ON public.project_members;

CREATE POLICY "Admins and managers can manage project members"
ON public.project_members
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  (is_project_member(auth.uid(), project_id) AND public.has_role(auth.uid(), 'manager'))
);

-- Add deactivated flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;