import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckCircle2, AlertCircle } from "lucide-react";

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  overdueTasks: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    pendingTasks: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const userRole = roleData?.role;
      const isAdminOrManager = userRole === "admin" || userRole === "manager";

      // Fetch active projects count
      let projectsQuery = supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (!isAdminOrManager) {
        // Staff: only show projects they're part of
        const { data: memberProjects } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id);
        
        const projectIds = memberProjects?.map(p => p.project_id) || [];
        if (projectIds.length === 0) {
          setStats({ activeProjects: 0, pendingTasks: 0, overdueTasks: 0 });
          setLoading(false);
          return;
        }
        projectsQuery = projectsQuery.in("id", projectIds);
      }

      const { count: projectsCount } = await projectsQuery;

      // Fetch pending tasks count
      let pendingQuery = supabase
        .from("tasks")
        .select("project_id", { count: "exact", head: true })
        .neq("status", "Done");

      if (!isAdminOrManager) {
        const { data: memberProjects } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id);
        
        const projectIds = memberProjects?.map(p => p.project_id) || [];
        if (projectIds.length > 0) {
          pendingQuery = pendingQuery.in("project_id", projectIds);
        }
      }

      const { count: pendingCount } = await pendingQuery;

      // Fetch overdue tasks count
      const now = new Date().toISOString();
      let overdueQuery = supabase
        .from("tasks")
        .select("project_id", { count: "exact", head: true })
        .lt("due_date", now)
        .neq("status", "Done");

      if (!isAdminOrManager) {
        const { data: memberProjects } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id);
        
        const projectIds = memberProjects?.map(p => p.project_id) || [];
        if (projectIds.length > 0) {
          overdueQuery = overdueQuery.in("project_id", projectIds);
        }
      }

      const { count: overdueCount } = await overdueQuery;

      setStats({
        activeProjects: projectsCount || 0,
        pendingTasks: pendingCount || 0,
        overdueTasks: overdueCount || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Agency Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card className="card-hover border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
