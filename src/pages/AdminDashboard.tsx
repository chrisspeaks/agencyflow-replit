import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, UserX, UserCheck, Loader2, UserPlus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isActive: boolean;
  role: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // Create user state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("staff");
  
  // Reset password state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUserName, setResetUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const currentUserRole = user?.profile?.role;
  const isAdmin = currentUserRole === "admin" || user?.roles?.includes("admin");

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
    enabled: isAdmin,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; role: string }) => {
      const response = await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast.success("User created successfully!");
      setCreateDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserRole("staff");
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: string; newPassword: string }) => {
      const response = await apiRequest("/api/admin/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast.success(`Password reset for ${resetUserName}. They'll be required to change it on next login.`);
      setResetDialogOpen(false);
      setNewPassword("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reset password");
    },
  });

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setUpdatingStatus(userId);
    try {
      await apiRequest(`/api/admin/users/${userId}/activate`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast.success(`User ${!currentStatus ? "activated" : "deactivated"} successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast.success("User role updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update user role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast.error("Please fill all fields");
      return;
    }
    createUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      fullName: newUserName,
      role: newUserRole,
    });
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    resetPasswordMutation.mutate({ userId: resetUserId, newPassword });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48 mb-2" />
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />Access Denied
            </CardTitle>
            <CardDescription>Admin access required.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user"><UserPlus className="h-4 w-4 mr-2" />Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Create a new user account. They will be required to change their password on first login.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Full Name</Label><Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="John Doe" data-testid="input-new-user-name" /></div>
              <div><Label>Email</Label><Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="john@example.com" data-testid="input-new-user-email" /></div>
              <div><Label>Password</Label><Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Temporary password" data-testid="input-new-user-password" /></div>
              <div><Label>Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger data-testid="select-new-user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={createUserMutation.isPending} data-testid="button-submit-create-user">
                {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Reset password for {resetUserName}. They will be required to change it on next login.</DialogDescription>
          </DialogHeader>
          <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New temporary password" data-testid="input-reset-password" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetPasswordMutation.isPending} data-testid="button-submit-reset-password">
              {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} data-testid={`row-user-${profile.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarImage src={profile.avatarUrl || ""} /><AvatarFallback>{profile.fullName.split(" ").map((n) => n[0]).join("").toUpperCase()}</AvatarFallback></Avatar>
                      <span className="font-medium">{profile.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                  <TableCell>
                    <Select value={profile.role || "staff"} onValueChange={(value) => updateUserRole(profile.id, value)} disabled={updatingRole === profile.id}>
                      <SelectTrigger className="w-[120px]">{updatingRole === profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}</SelectTrigger>
                      <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant={profile.isActive ? "default" : "secondary"}>{profile.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setResetUserId(profile.id); setResetUserName(profile.fullName); setResetDialogOpen(true); }} data-testid={`button-reset-pw-${profile.id}`}>
                        <KeyRound className="h-4 w-4 mr-1" />Reset PW
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleUserStatus(profile.id, profile.isActive)} disabled={updatingStatus === profile.id} data-testid={`button-toggle-status-${profile.id}`}>
                        {updatingStatus === profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : profile.isActive ? <><UserX className="h-4 w-4 mr-1" />Deactivate</> : <><UserCheck className="h-4 w-4 mr-1" />Activate</>}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
