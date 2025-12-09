import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { History, User, MessageSquare, Users, UserPlus, UserMinus, Flag, Activity } from "lucide-react";

interface TaskLog {
  id: string;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  details: any;
  createdAt: string;
  userId: string;
  userName?: string;
}

interface TaskLogsProps {
  taskId: string;
  filterType?: "assignee" | "comment" | "priority" | "progress";
}

export function TaskLogs({ taskId, filterType }: TaskLogsProps) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = `/api/tasks/${taskId}/logs?type=${filterType}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error("Failed to fetch logs");
      
      const data = await response.json();
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, taskId, filterType]);

  const renderCommentLog = (log: TaskLog) => (
    <div key={log.id} className="p-2 rounded-md bg-muted/50 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="font-medium">{log.userName || "Unknown"}</span>
        <span className="text-muted-foreground">commented</span>
      </div>
      <div className="pl-5 text-foreground whitespace-pre-wrap break-words">
        {log.newValue || log.details || "No content"}
      </div>
      <div className="pl-5 text-muted-foreground mt-1">
        {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
      </div>
    </div>
  );

  const renderAssignmentLog = (log: TaskLog) => {
    const isAdded = log.actionType === "assignee_added";
    const Icon = isAdded ? UserPlus : UserMinus;
    
    return (
      <div key={log.id} className="p-2 rounded-md bg-muted/50 text-xs">
        <div className="flex items-start gap-2">
          <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${isAdded ? "text-green-600" : "text-red-600"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-medium">{log.userName || "Unknown"}</span>
              <span className="text-muted-foreground">
                {isAdded ? "assigned" : "unassigned"}
              </span>
              <span className="font-medium">
                {log.details || (isAdded ? log.newValue : log.oldValue) || "a user"}
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPriorityLog = (log: TaskLog) => {
    return (
      <div key={log.id} className="p-2 rounded-md bg-muted/50 text-xs">
        <div className="flex items-start gap-2">
          <Flag className="h-3 w-3 shrink-0 mt-0.5 text-orange-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-medium">{log.userName || "Unknown"}</span>
              <span className="text-muted-foreground">changed priority from</span>
              <span className="font-medium">{log.oldValue || "None"}</span>
              <span className="text-muted-foreground">to</span>
              <span className="font-medium">{log.newValue || "None"}</span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProgressLog = (log: TaskLog) => {
    return (
      <div key={log.id} className="p-2 rounded-md bg-muted/50 text-xs">
        <div className="flex items-start gap-2">
          <Activity className="h-3 w-3 shrink-0 mt-0.5 text-blue-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-medium">{log.userName || "Unknown"}</span>
              <span className="text-muted-foreground">changed status from</span>
              <span className="font-medium">{log.oldValue || "None"}</span>
              <span className="text-muted-foreground">to</span>
              <span className="font-medium">{log.newValue || "None"}</span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getButtonLabel = () => {
    switch (filterType) {
      case "comment": return "View Comment History";
      case "assignee": return "View Assignment History";
      case "priority": return "View Priority History";
      case "progress": return "View Status History";
      default: return "View History";
    }
  };

  const getTitleAndIcon = () => {
    switch (filterType) {
      case "comment": return { title: "Comment History", Icon: MessageSquare };
      case "assignee": return { title: "Assignment History", Icon: Users };
      case "priority": return { title: "Priority History", Icon: Flag };
      case "progress": return { title: "Status History", Icon: Activity };
      default: return { title: "History", Icon: History };
    }
  };

  const getEmptyMessage = () => {
    switch (filterType) {
      case "comment": return "No comments yet";
      case "assignee": return "No assignment changes yet";
      case "priority": return "No priority changes yet";
      case "progress": return "No status changes yet";
      default: return "No history yet";
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground"
        data-testid={`button-view-${filterType}-logs`}
      >
        <History className="h-3 w-3 mr-1" />
        {getButtonLabel()}
      </Button>
    );
  }

  const { title, Icon } = getTitleAndIcon();

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Icon className="h-4 w-4" />
          {title}
        </h4>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsOpen(false)}
          data-testid={`button-close-${filterType}-logs`}
        >
          Close
        </Button>
      </div>
      <Separator className="mb-2" />
      <ScrollArea className="h-[200px]">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {getEmptyMessage()}
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              switch (filterType) {
                case "comment": return renderCommentLog(log);
                case "assignee": return renderAssignmentLog(log);
                case "priority": return renderPriorityLog(log);
                case "progress": return renderProgressLog(log);
                default: return null;
              }
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
