import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskDialog } from "@/components/TaskDialog";
import { TeamMembersDialog } from "@/components/TeamMembersDialog";
import { CalendarView } from "@/components/CalendarView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Calendar, LayoutGrid, Users, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  description: string | null;
  brand_color: string;
  status: string;
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch project and user role in parallel
      const [projectResult, roleResult] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
      ]);

      if (projectResult.error) throw projectResult.error;
      setProject(projectResult.data);
      setUserRole(roleResult.data?.role || null);
    } catch (error: any) {
      console.error("Error fetching project:", error);
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = () => {
    setRefreshKey(prev => prev + 1);
    setIsTaskDialogOpen(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;
    setUpdatingStatus(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus as any })
        .eq("id", project.id);

      if (error) throw error;

      setProject({ ...project, status: newStatus });
      toast({
        title: "Project updated",
        description: `Project status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isAdminOrManager = userRole === "admin" || userRole === "manager";
  const isClosed = project?.status === "completed" || project?.status === "archived";

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  // If closed and not admin/manager, show restricted message
  if (isClosed && !isAdminOrManager) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Project Closed</h2>
          <p className="text-muted-foreground">This project has been closed. Only admins and managers can view its details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-bold truncate">{project.name}</h1>
              <Badge variant={project.status === "active" ? "default" : "secondary"}>
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1 text-sm truncate">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdminOrManager && (
            <>
              <Select
                value={project.status}
                onValueChange={handleStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setIsTeamDialogOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Manage Team</span>
                <span className="sm:hidden">Team</span>
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setIsTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Task</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="kanban" className="flex-1 sm:flex-none">
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Kanban Board</span>
            <span className="sm:hidden">Board</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 sm:flex-none">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Calendar View</span>
            <span className="sm:hidden">Calendar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4 sm:mt-6">
          <KanbanBoard projectId={projectId!} refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4 sm:mt-6">
          <CalendarView projectId={projectId!} refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        projectId={projectId!}
        onTaskCreated={handleTaskCreated}
      />

      <TeamMembersDialog
        open={isTeamDialogOpen}
        onOpenChange={setIsTeamDialogOpen}
        projectId={projectId!}
      />
    </div>
  );
}