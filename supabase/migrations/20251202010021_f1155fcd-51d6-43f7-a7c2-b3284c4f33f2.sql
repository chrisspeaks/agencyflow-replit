-- Create task_assignees junction table for multiple assignees per task
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS on task_assignees
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_assignees
CREATE POLICY "Users can view task assignees for accessible tasks"
  ON public.task_assignees FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_assignees.task_id
      AND (is_admin(auth.uid()) OR is_project_member(auth.uid(), tasks.project_id))
    )
  );

CREATE POLICY "Project members can manage task assignees"
  ON public.task_assignees FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_assignees.task_id
      AND (is_admin(auth.uid()) OR is_project_member(auth.uid(), tasks.project_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_assignees.task_id
      AND (is_admin(auth.uid()) OR is_project_member(auth.uid(), tasks.project_id))
    )
  );

-- Update the handle_new_user function to set users as inactive by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'staff'),
    false  -- Set to inactive by default, admin must approve
  );
  RETURN new;
END;
$$;