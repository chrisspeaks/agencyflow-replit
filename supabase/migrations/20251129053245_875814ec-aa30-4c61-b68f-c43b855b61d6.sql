-- Create enum types for better type safety
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE public.project_status AS ENUM ('active', 'archived', 'completed');
CREATE TYPE public.task_priority AS ENUM ('P1-High', 'P2-Medium', 'P3-Low');
CREATE TYPE public.task_status AS ENUM ('Todo', 'In Progress', 'Internal Review', 'Done');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  avatar_url TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  brand_color TEXT NOT NULL DEFAULT '#0f172a',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project members junction table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'P2-Medium',
  status task_status NOT NULL DEFAULT 'Todo',
  due_date TIMESTAMPTZ,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Helper function to check if user is project member
CREATE OR REPLACE FUNCTION public.is_project_member(user_id UUID, proj_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.user_id = is_project_member.user_id 
    AND project_members.project_id = proj_id
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for projects
CREATE POLICY "Admins can view all projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Members can view their projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_project_member(auth.uid(), id));

CREATE POLICY "Admins and managers can insert projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager'
  );

CREATE POLICY "Admins and managers can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    (public.is_project_member(auth.uid(), id) AND 
     (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
  );

-- RLS Policies for project_members
CREATE POLICY "Users can view project members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    public.is_project_member(auth.uid(), project_id)
  );

CREATE POLICY "Admins and managers can manage project members"
  ON public.project_members FOR ALL
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    (public.is_project_member(auth.uid(), project_id) AND 
     (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
  );

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their projects"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    public.is_project_member(auth.uid(), project_id)
  );

CREATE POLICY "Admins and managers can insert tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR 
    (public.is_project_member(auth.uid(), project_id) AND 
     (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update all tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    (public.is_project_member(auth.uid(), project_id) AND 
     (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
  );

CREATE POLICY "Staff can update assigned tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (assignee_id = auth.uid())
  WITH CHECK (assignee_id = auth.uid());

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on accessible tasks"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_id
      AND (public.is_admin(auth.uid()) OR public.is_project_member(auth.uid(), tasks.project_id))
    )
  );

CREATE POLICY "Users can insert comments on accessible tasks"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_id
      AND (public.is_admin(auth.uid()) OR public.is_project_member(auth.uid(), tasks.project_id))
    )
  );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();