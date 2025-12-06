import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/appConfig";
import { ArrowRight, Zap, Shield, BarChart3, Layers } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] text-white overflow-hidden relative">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(220,20%,12%)_1px,transparent_1px),linear-gradient(90deg,hsl(220,20%,12%)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_70%,transparent_110%)]" />
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      
      {/* Floating geometric shapes */}
      <div className="absolute top-20 right-20 w-32 h-32 border border-accent/20 rotate-45 animate-spin" style={{ animationDuration: "20s" }} />
      <div className="absolute bottom-40 left-16 w-24 h-24 border border-white/10 rounded-full animate-bounce" style={{ animationDuration: "3s" }} />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/50 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/auth")}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
            >
              Sign In
            </Button>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 pt-16 pb-32">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-sm">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm text-accent font-medium">Enterprise Task Management</span>
              </div>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-center leading-[1.1] tracking-tight mb-8">
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Streamline Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-accent via-accent to-cyan-300 bg-clip-text text-transparent">
                Workflow
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
              Next-generation project management built for modern enterprises. 
              Empower your teams with intelligent task orchestration and real-time collaboration.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-24">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="bg-accent hover:bg-accent/90 text-white px-8 py-6 text-lg gap-3 group"
              >
                Get Started
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/auth")}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white px-8 py-6 text-lg backdrop-blur-sm"
              >
                Request Demo
              </Button>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Real-time Analytics"
                description="Monitor project health with live dashboards and intelligent insights"
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Enterprise Security"
                description="Role-based access control with granular permissions management"
              />
              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Instant Sync"
                description="Seamless collaboration with real-time updates across all devices"
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/40 text-sm">
            <p>© 2024 {APP_NAME}. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white/60 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white/60 cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-white/60 cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => (
  <div className="group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-accent/30 transition-all duration-300">
    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-4 group-hover:bg-accent/30 transition-colors">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
    <p className="text-white/50 text-sm leading-relaxed">{description}</p>
  </div>
);

export default Index;
