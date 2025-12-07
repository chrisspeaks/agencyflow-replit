import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { History, User, MessageSquare, Users, UserPlus, UserMinus } from "lucide-react";

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
  filterType?: "assignee" | "comment";
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
        {filterType === "comment" ? "View Comment History" : "View Assignment History"}
      </Button>
    );
  }

  const title = filterType === "comment" ? "Comment History" : "Assignment History";
  const Icon = filterType === "comment" ? MessageSquare : Users;

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
            {filterType === "comment" ? "No comments yet" : "No assignment changes yet"}
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              filterType === "comment" 
                ? renderCommentLog(log) 
                : renderAssignmentLog(log)
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
