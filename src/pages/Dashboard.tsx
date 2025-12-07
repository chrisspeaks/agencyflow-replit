import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { TaskDialog } from "@/components/TaskDialog";
import { queryClient } from "@/lib/queryClient";

interface Project {
  id: string;
  name: string;
  brandColor: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  projectId: string;
  assigneeName?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !!user,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const loading = projectsLoading || tasksLoading;

  const activeProjects = projects.filter(p => p.status === "active").slice(0, 5);

  const now = new Date();
  const pendingTasks: Task[] = [];
  const overdueTasks: Task[] = [];

  tasks.filter(t => t.status !== "Done").forEach(task => {
    if (task.dueDate && new Date(task.dueDate) < now) {
      overdueTasks.push(task);
    } else {
      pendingTasks.push(task);
    }
  });

  const handleTaskClick = async (task: Task) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks/${task.id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (response.ok) {
        const fullTask = await response.json();
        setSelectedTask({ ...task, ...fullTask });
        setIsTaskDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    }
  };

  const handleTaskDialogClose = (open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) {
      setSelectedTask(null);
    }
  };

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-1 sm:p-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Agency Overview</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="p-4 sm:p-6 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-32 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-1 sm:p-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Agency Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground mb-3">Currently in progress</p>
            <div className="space-y-1.5">
              {activeProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer text-xs"
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.brandColor }} />
                  <span className="truncate font-medium">{project.name}</span>
                </div>
              ))}
              {activeProjects.length === 0 && (
                <p className="text-xs text-muted-foreground">No active projects</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground mb-3">Awaiting completion</p>
            <div className="space-y-1.5">
              {pendingTasks.slice(0, 5).map((task) => (
                <div 
                  key={task.id} 
                  className="p-1.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer text-xs" 
                  onClick={() => handleTaskClick(task)}
                  data-testid={`card-task-${task.id}`}
                >
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                    {task.assigneeName && <span className="truncate">- {task.assigneeName}</span>}
                  </div>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <p className="text-xs text-muted-foreground">No pending tasks</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl font-bold text-destructive">{overdueTasks.length}</div>
            <p className="text-xs text-muted-foreground mb-3">Need attention</p>
            <div className="space-y-1.5">
              {overdueTasks.slice(0, 5).map((task) => (
                <div 
                  key={task.id} 
                  className="p-1.5 rounded-md bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 cursor-pointer text-xs" 
                  onClick={() => handleTaskClick(task)}
                  data-testid={`card-task-overdue-${task.id}`}
                >
                  <div className="font-medium truncate text-destructive">{task.title}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-destructive">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                    {task.assigneeName && <span className="truncate">- {task.assigneeName}</span>}
                  </div>
                </div>
              ))}
              {overdueTasks.length === 0 && (
                <p className="text-xs text-muted-foreground">No overdue tasks</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedTask && (
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={handleTaskDialogClose}
          projectId={selectedTask.projectId}
          task={selectedTask}
          onTaskCreated={handleTaskUpdated}
        />
      )}
    </div>
  );
};

export default Dashboard;
