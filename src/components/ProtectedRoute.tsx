import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!user.profile?.isActive) {
      logout();
      navigate("/auth?inactive=true");
      return;
    }

    if (user.profile?.forcePasswordChange && location.pathname !== "/change-password") {
      navigate("/change-password");
      return;
    }
  }, [user, isLoading, navigate, location.pathname, logout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
