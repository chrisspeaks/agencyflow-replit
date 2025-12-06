import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/config/appConfig";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { createNotificationForUser } from "@/lib/notifications";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: any;
  onTaskCreated: () => void;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  projectId,
  task,
  onTaskCreated,
}: TaskDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [projectName, setProjectName] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Todo",
    priority: "P2-Medium",
    assignee_ids: [] as string[],
    due_date: null as Date | null,
    is_blocked: false,
    comments: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch team members");
      const data = await response.json();
      const members = data.map((m: any) => ({
        id: m.user_id,
        full_name: m.full_name || m.email,
        email: m.email,
      }));
      setTeamMembers(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  }, [projectId]);

  const fetchProjectName = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch project");
      const data = await response.json();
      setProjectName(data.name);
    } catch (error) {
      console.error("Error fetching project name:", error);
    }
  }, [projectId]);

  const fetchTaskAssignees = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch assignees");
      const data = await response.json();
      setFormData(prev => ({ ...prev, assignee_ids: data.map((a: any) => a.user_id) }));
    } catch (error) {
      console.error("Error fetching task assignees:", error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTeamMembers();
      fetchProjectName();
      if (task) {
        fetchTaskAssignees(task.id);
        setFormData({
          title: task.title || "",
          description: task.description || "",
          status: task.status || "Todo",
          priority: task.priority || "P2-Medium",
          assignee_ids: [],
          due_date: task.due_date ? new Date(task.due_date) : null,
          is_blocked: task.is_blocked || false,
          comments: task.comments || "",
        });
      } else {
        setFormData({
          title: "",
          description: "",
          status: "Todo",
          priority: "P2-Medium",
          assignee_ids: [],
          due_date: null,
          is_blocked: false,
          comments: "",
        });
      }
    }
  }, [open, task, fetchTeamMembers, fetchProjectName, fetchTaskAssignees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { assignee_ids, ...taskData } = formData;
      const finalTaskData = {
        ...taskData,
        project_id: projectId,
        due_date: formData.due_date?.toISOString(),
      };

      let resultData;
      if (task) {
        const response = await apiRequest(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify(finalTaskData),
        });
        resultData = await response.json();
      } else {
        const response = await apiRequest("/api/tasks", {
          method: "POST",
          body: JSON.stringify(finalTaskData),
        });
        resultData = await response.json();
      }

      const taskId = task ? task.id : resultData.id;

      if (task) {
        const assigneesRes = await fetch(`/api/tasks/${task.id}/assignees`, {
          headers: getAuthHeaders(),
        });
        const previousAssignees = assigneesRes.ok ? await assigneesRes.json() : [];
        const previousIds = previousAssignees.map((a: any) => a.user_id);
        const addedIds = assignee_ids.filter(id => !previousIds.includes(id));
        const removedIds = previousIds.filter((id: string) => !assignee_ids.includes(id));

        for (const userId of removedIds) {
          await apiRequest(`/api/tasks/${task.id}/assignees/${userId}`, {
            method: "DELETE",
          });
          
          const member = teamMembers.find(m => m.id === userId);
          if (member) {
            createNotificationForUser(
              userId,
              "Task Unassigned",
              `You have been unassigned from task "${formData.title}" in project "${projectName}"`,
              "task_assignment",
              `/projects/${projectId}`
            );
          }
        }

        if (addedIds.length > 0) {
          await apiRequest(`/api/tasks/${task.id}/assignees`, {
            method: "POST",
            body: JSON.stringify({ userIds: addedIds }),
          });

          for (const userId of addedIds) {
            const member = teamMembers.find(m => m.id === userId);
            if (member) {
              createNotificationForUser(
                userId,
                "New Task Assigned",
                `You have been assigned to task "${formData.title}" in project "${projectName}"`,
                "task_assignment",
                `/projects/${projectId}`
              );
            }
          }
        }
      } else if (assignee_ids.length > 0) {
        await apiRequest(`/api/tasks/${taskId}/assignees`, {
          method: "POST",
          body: JSON.stringify({ userIds: assignee_ids }),
        });

        for (const userId of assignee_ids) {
          const member = teamMembers.find(m => m.id === userId);
          if (member) {
            createNotificationForUser(
              userId,
              "New Task Assigned",
              `You have been assigned to task "${formData.title}" in project "${projectName}"`,
              "task_assignment",
              `/projects/${projectId}`
            );
          }
        }
      }

      toast({
        title: task ? "Task updated" : "Task created",
        description: task
          ? "Task has been updated successfully"
          : "Task has been created successfully",
      });

      onTaskCreated();
    } catch (error: any) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter task title"
              required
              className="h-9 sm:h-10"
              data-testid="input-task-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter task description"
              rows={3}
              className="text-sm"
              data-testid="input-task-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm">Comments</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              placeholder="Add any additional comments or notes"
              rows={2}
              className="text-sm"
              data-testid="input-task-comments"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger className="h-9 sm:h-10" data-testid="select-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger className="h-9 sm:h-10" data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Assign To (Multiple)</Label>
            <div className="border rounded-md p-2 sm:p-3 space-y-2 max-h-36 sm:max-h-48 overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  No team members. Add members to the project first.
                </p>
              ) : (
                teamMembers.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 cursor-pointer py-1">
                    <Checkbox
                      checked={formData.assignee_ids.includes(member.id)}
                      onCheckedChange={(checked) => {
                        const newIds = checked
                          ? [...formData.assignee_ids, member.id]
                          : formData.assignee_ids.filter(id => id !== member.id);
                        setFormData({ ...formData, assignee_ids: newIds });
                      }}
                      data-testid={`checkbox-assignee-${member.id}`}
                    />
                    <span className="text-xs sm:text-sm">{member.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-9 sm:h-10 text-sm"
                  data-testid="button-task-due-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? (
                    format(formData.due_date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date || undefined}
                  onSelect={(date) =>
                    setFormData({ ...formData, due_date: date || null })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="blocked"
              checked={formData.is_blocked}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_blocked: checked })
              }
              data-testid="switch-task-blocked"
            />
            <Label htmlFor="blocked" className="text-sm">Task is blocked</Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto h-9 sm:h-10"
              data-testid="button-task-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto h-9 sm:h-10" data-testid="button-task-submit">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? "Update" : "Create"} Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
