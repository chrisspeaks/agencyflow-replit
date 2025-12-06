import { useState, useEffect } from "react";
import { getAuthHeaders, useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X, UserPlus } from "lucide-react";
import { createNotificationForUser } from "@/lib/notifications";

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface ProjectMember {
  user_id: string;
  full_name: string;
  email: string;
}

export function TeamMembersDialog({
  open,
  onOpenChange,
  projectId,
}: TeamMembersDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (open) {
      fetchAllUsers();
      fetchProjectMembers();
    }
  }, [open, projectId]);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch("/api/profiles", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setAllUsers(data.map((p: any) => ({
        id: p.id,
        full_name: p.fullName || p.full_name || p.email,
        email: p.email,
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch project members");
      const data = await response.json();
      setProjectMembers(data);
    } catch (error) {
      console.error("Error fetching project members:", error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add member");
      }

      // Get project name for notification
      const projectResponse = await fetch(`/api/projects/${projectId}`, {
        headers: getAuthHeaders(),
      });
      const projectData = projectResponse.ok ? await projectResponse.json() : null;

      const member = allUsers.find(u => u.id === selectedUserId);

      if (projectData && member) {
        // Create in-app notification
        await createNotificationForUser(
          member.id,
          "Added to Project",
          `You have been added to the project "${projectData.name}"`,
          "project_member",
          `/projects/${projectId}`
        );
      }

      toast({
        title: "Member added",
        description: "Team member has been added to the project",
      });

      setSelectedUserId("");
      fetchProjectMembers();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setLoading(true);
    try {
      // Get member details before removing
      const memberToRemove = projectMembers.find(m => m.user_id === userId);
      
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

      // Send removal notification
      if (memberToRemove) {
        const projectResponse = await fetch(`/api/projects/${projectId}`, {
          headers: getAuthHeaders(),
        });
        const projectData = projectResponse.ok ? await projectResponse.json() : null;

        if (projectData) {
          // Create in-app notification
          await createNotificationForUser(
            memberToRemove.user_id,
            "Removed from Project",
            `You have been removed from the project "${projectData.name}"`,
            "project_member"
          );
        }
      }

      toast({
        title: "Member removed",
        description: "Team member has been removed from the project",
      });

      fetchProjectMembers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = allUsers.filter(
    (user) => !projectMembers.some((member) => member.user_id === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Team Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Member Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Add Team Member</h3>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1" data-testid="select-user">
                  <SelectValue placeholder="Select a user to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id} data-testid={`select-user-${user.id}`}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId || loading}
                data-testid="button-add-member"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Current Members Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">
              Current Members ({projectMembers.length})
            </h3>
            <div className="space-y-2">
              {projectMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No team members yet. Add members to start collaborating.
                </p>
              ) : (
                projectMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`member-row-${member.user_id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{member.full_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={loading}
                      data-testid={`button-remove-member-${member.user_id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
