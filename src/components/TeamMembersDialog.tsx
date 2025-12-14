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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, X, UserPlus, Search } from "lucide-react";
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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      fetchAllUsers();
      fetchProjectMembers();
      setSelectedUserIds([]);
      setSearchQuery("");
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

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      // Get project name for notifications
      const projectResponse = await fetch(`/api/projects/${projectId}`, {
        headers: getAuthHeaders(),
      });
      const projectData = projectResponse.ok ? await projectResponse.json() : null;

      let addedCount = 0;
      const errors: string[] = [];

      for (const userId of selectedUserIds) {
        try {
          const response = await fetch(`/api/projects/${projectId}/members`, {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            const error = await response.json();
            errors.push(error.error || "Failed to add member");
            continue;
          }

          addedCount++;

          const member = allUsers.find(u => u.id === userId);
          if (projectData && member) {
            await createNotificationForUser(
              member.id,
              "Added to Project",
              `You have been added to the project "${projectData.name}"`,
              "project_member",
              `/projects/${projectId}`
            );
          }
        } catch (err) {
          errors.push("Failed to add a member");
        }
      }

      if (addedCount > 0) {
        toast({
          title: "Members added",
          description: `${addedCount} team member${addedCount > 1 ? "s have" : " has"} been added to the project`,
        });
      }

      if (errors.length > 0) {
        toast({
          title: "Some members could not be added",
          description: errors[0],
          variant: "destructive",
        });
      }

      setSelectedUserIds([]);
      setSearchQuery("");
      fetchProjectMembers();
    } catch (error: any) {
      console.error("Error adding members:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team members",
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

  const filteredAvailableUsers = availableUsers.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Team Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Member Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Add Team Members</h3>
              {selectedUserIds.length > 0 && (
                <Button
                  onClick={handleAddMembers}
                  disabled={loading}
                  size="sm"
                  data-testid="button-add-members"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Add {selectedUserIds.length} Member{selectedUserIds.length > 1 ? "s" : ""}
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredAvailableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">
                  {availableUsers.length === 0
                    ? "All users are already team members"
                    : "No users match your search"}
                </p>
              ) : (
                filteredAvailableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover-elevate cursor-pointer border-b last:border-b-0"
                    onClick={() => toggleUserSelection(user.id)}
                    data-testid={`checkbox-user-${user.id}`}
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`checkbox-input-${user.id}`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{user.full_name}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                ))
              )}
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
