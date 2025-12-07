import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectDialog } from "@/components/ProjectDialog";
import { queryClient } from "@/lib/queryClient";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  brandColor: string;
}

const Projects = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = user?.profile?.role;
  const isAdminOrManager = userRole === "admin" || userRole === "manager";

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !!user,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Filter out closed projects for staff
  const filteredProjects = isAdminOrManager 
    ? projects 
    : projects.filter(p => p.status === "active");

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-1 sm:p-0">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-2 w-full mb-4" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm">Manage your agency projects</p>
        </div>
        {isAdminOrManager && (
          <Button className="gap-2" onClick={() => setDialogOpen(true)} data-testid="button-new-project">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">No projects yet. Create your first project to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="card-hover cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
              data-testid={`card-project-${project.id}`}
            >
              <CardHeader className="p-4 sm:p-6">
                <div
                  className="w-full h-2 rounded-t-lg mb-4"
                  style={{ backgroundColor: project.brandColor }}
                />
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">{project.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === "active"
                        ? "bg-success/10 text-success"
                        : project.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
