import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, AlertCircle, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { TaskDialog } from "@/components/TaskDialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  isBlocked: boolean;
  projectId: string;
  comments: string | null;
  projectName?: string;
  projectColor?: string;
}

type SortField = "none" | "dueDate" | "priority";
type SortDirection = "asc" | "desc";

export default function MyWorkbench() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: tasks = [], isLoading, refetch } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { assigneeId: user?.id }],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(`/api/tasks?assigneeId=${user?.id}`, { headers });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user,
  });

  const handleTaskUpdated = () => {
    refetch();
    setIsEditDialogOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P1-High":
        return "destructive" as const;
      case "P2-Medium":
        return "warning" as const;
      case "P3-Low":
        return "secondary" as const;
      default:
        return "secondary" as const;
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "Done") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === "In Progress") return <Clock className="h-4 w-4 text-warning" />;
    return null;
  };

  const todoTasks = tasks.filter((t) => t.status === "Todo");
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  const internalReviewTasks = tasks.filter((t) => t.status === "Internal Review");
  const pendingClientReviewTasks = tasks.filter((t) => t.status === "Pending Client Review");
  const doneTasks = tasks.filter((t) => t.status === "Done");

  const getPriorityWeight = (priority: string): number => {
    switch (priority) {
      case "P1-High": return 1;
      case "P2-Medium": return 2;
      case "P3-Low": return 3;
      default: return 4;
    }
  };

  const sortedTasks = useMemo(() => {
    if (sortField === "none") return tasks;
    
    return [...tasks].sort((a, b) => {
      if (sortField === "dueDate") {
        const hasDateA = !!a.dueDate;
        const hasDateB = !!b.dueDate;
        
        // Tasks without due dates always go to the bottom
        if (!hasDateA && !hasDateB) return 0;
        if (!hasDateA) return 1;
        if (!hasDateB) return -1;
        
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();
        const comparison = dateA - dateB;
        return sortDirection === "asc" ? comparison : -comparison;
      } else if (sortField === "priority") {
        const comparison = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
        return sortDirection === "asc" ? comparison : -comparison;
      }
      
      return 0;
    });
  }, [tasks, sortField, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  const handleSortChange = (value: string) => {
    if (value === sortField) {
      toggleSortDirection();
    } else {
      setSortField(value as SortField);
      setSortDirection("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Workbench</h1>
          <p className="text-muted-foreground mt-1">
            All tasks assigned to you across projects
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">To Do</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-todo-count">{todoTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-inprogress-count">{inProgressTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Internal Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-internal-review-count">{internalReviewTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Client Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-client-review-count">{pendingClientReviewTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-done-count">{doneTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>My Tasks</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={sortField} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[160px]" data-testid="select-sort-field">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sorting</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
              {sortField !== "none" && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSortDirection}
                  data-testid="button-toggle-sort-direction"
                >
                  {sortDirection === "asc" ? (
                    sortField === "dueDate" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    sortField === "dueDate" ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )
                  )}
                </Button>
              )}
              {sortField !== "none" && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {sortField === "dueDate" 
                    ? (sortDirection === "asc" ? "Earliest first" : "Latest first")
                    : (sortDirection === "asc" ? "High to Low" : "Low to High")
                  }
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sortedTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                You don't have any assigned tasks yet
              </p>
            ) : (
              <div className="space-y-3">
                {sortedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsEditDialogOpen(true);
                    }}
                    data-testid={`card-task-${task.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            {getStatusIcon(task.status)}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {task.projectName && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{
                                  borderColor: task.projectColor || "#888",
                                  color: task.projectColor || "#888",
                                }}
                              >
                                {task.projectName}
                              </Badge>
                            )}
                            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                              {task.priority}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {task.status}
                            </Badge>
                            {task.isBlocked && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Blocked
                              </Badge>
                            )}
                          </div>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(task.dueDate), "MMM dd")}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTask && (
        <TaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          projectId={selectedTask.projectId}
          task={selectedTask}
          onTaskCreated={handleTaskUpdated}
        />
      )}
    </>
  );
}
