
-- Team members table for team management
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  mobile text,
  role text NOT NULL DEFAULT 'sales_manager',
  department text,
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Team tasks table
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team performance log
CREATE TABLE IF NOT EXISTS public.team_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL,
  metric_value numeric DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_performance ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins manage team_members" ON public.team_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage team_tasks" ON public.team_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members view own tasks" ON public.team_tasks
  FOR SELECT TO authenticated
  USING (assigned_to IN (SELECT id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage team_performance" ON public.team_performance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
