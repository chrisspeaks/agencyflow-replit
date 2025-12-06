import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { APP_NAME } from "@/config/appConfig";
import { ArrowLeft, Layers, Zap } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inactiveMessage, setInactiveMessage] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('inactive') === 'true') {
      setInactiveMessage(true);
      toast.error("Your account is pending approval. Please contact an administrator.");
    }

    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [navigate, user, isLoading]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await login(email, password);

    if (!result.success) {
      toast.error(result.error || "Login failed");
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,8%)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] text-white overflow-hidden relative flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(hsl(220,20%,12%)_1px,transparent_1px),linear-gradient(90deg,hsl(220,20%,12%)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_70%,transparent_110%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      
      <div className="absolute top-20 right-20 w-32 h-32 border border-accent/20 rotate-45 animate-spin" style={{ animationDuration: "20s" }} />
      <div className="absolute bottom-40 left-16 w-24 h-24 border border-white/10 rounded-full animate-bounce" style={{ animationDuration: "3s" }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm text-accent font-medium">Enterprise Task Management</span>
          </div>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/50 rounded-xl flex items-center justify-center">
                <Layers className="w-7 h-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">{APP_NAME}</CardTitle>
            <CardDescription className="text-white/60">Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {inactiveMessage && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/20 border border-destructive/30 text-destructive-foreground text-sm">
                Your account is pending approval. Please contact an administrator.
              </div>
            )}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-white/80">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  data-testid="input-email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-white/80">Password</Label>
                <Input
                  id="signin-password"
                  name="password"
                  type="password"
                  required
                  data-testid="input-password"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-accent"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-accent hover:bg-accent/90 text-white" 
                disabled={loading}
                data-testid="button-signin"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-white/40 text-sm mt-6">
          This is an invite-only system. Contact your administrator for access.
        </p>
      </div>
    </div>
  );
};

export default Auth;
