import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { History, User, ArrowRight, MessageSquare, Users } from "lucide-react";

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
  filterType?: "status" | "assignee" | "comment" | "all";
}

export function TaskLogs({ taskId, filterType = "all" }: TaskLogsProps) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = filterType === "all" 
        ? `/api/tasks/${taskId}/logs`
        : `/api/tasks/${taskId}/logs?type=${filterType}`;
      
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

  const getActionIcon = (type: string) => {
    switch (type) {
      case "status":
        return <ArrowRight className="h-4 w-4" />;
      case "assignee":
        return <Users className="h-4 w-4" />;
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActionLabel = (log: TaskLog) => {
    switch (log.actionType) {
      case "status":
        return (
          <span>
            changed status from <strong>{log.oldValue || "None"}</strong> to{" "}
            <strong>{log.newValue}</strong>
          </span>
        );
      case "assignee":
        if (log.oldValue && log.newValue) {
          return (
            <span>
              changed assignee from <strong>{log.oldValue}</strong> to{" "}
              <strong>{log.newValue}</strong>
            </span>
          );
        } else if (log.newValue) {
          return (
            <span>
              assigned <strong>{log.newValue}</strong>
            </span>
          );
        } else {
          return (
            <span>
              unassigned <strong>{log.oldValue}</strong>
            </span>
          );
        }
      case "comment":
        return <span>added a comment</span>;
      default:
        return <span>{log.actionType}</span>;
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <History className="h-3 w-3 mr-1" />
        See Logs
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <History className="h-4 w-4" />
          {filterType === "assignee" ? "Assignment History" : filterType === "all" ? "Activity Log" : "Status History"}
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Close
        </Button>
      </div>
      <Separator className="mb-2" />
      <ScrollArea className="h-[200px]">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No activity recorded yet</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 text-xs">
                <div className="shrink-0 mt-0.5 text-muted-foreground">
                  {getActionIcon(log.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{log.userName || "Unknown"}</span>
                    <span className="text-muted-foreground">{getActionLabel(log)}</span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
