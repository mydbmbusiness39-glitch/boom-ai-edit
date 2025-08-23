import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Upload, Palette, Edit, Activity, Zap, LogOut, Sparkles, TrendingUp, Users, Scissors, Layers, Link2, Volume2, Bot, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: Zap },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/clip-post", label: "Clip & Post", icon: Scissors },
    { href: "/batch-processor", label: "Batch", icon: Layers },
    { href: "/auto-upload", label: "Auto-Upload", icon: Link2 },
    { href: "/voice-cloning", label: "Voice Clone", icon: Volume2 },
    { href: "/ai-host", label: "AI Host", icon: Bot },
    { href: "/dynamic-overlays", label: "Overlays", icon: Monitor },
    { href: "/style", label: "Style", icon: Palette },
    { href: "/editor", label: "Editor", icon: Edit },
    { href: "/script-generator", label: "Scripts", icon: Sparkles },
    { href: "/trend-sync", label: "Trends", icon: TrendingUp },
    { href: "/community-collab", label: "Collab", icon: Users },
    { href: "/status", label: "Status", icon: Activity },
  ];

  return (
    <nav className="flex items-center justify-between w-full p-4 bg-card border-b border-border">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Zap className="h-8 w-8 text-neon-purple" />
          <div className="absolute inset-0 h-8 w-8 text-neon-purple animate-pulse opacity-50" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
          BOOM!
        </span>
        <span className="text-lg text-muted-foreground">AI Video Editor</span>
      </div>

      <div className="flex items-center space-x-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location.pathname === href;
          
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300",
                "hover:bg-secondary/50 hover:shadow-lg",
                isActive && [
                  "bg-primary/10 text-primary",
                  "shadow-[0_0_20px_hsl(var(--neon-purple)/0.3)]",
                  "border border-primary/20"
                ],
                !isActive && "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-4 w-4",
                isActive && "text-primary"
              )} />
              <span className="hidden md:inline-block">{label}</span>
            </Link>
          );
        })}
        
        {user && (
          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-muted-foreground hidden md:inline-block" data-cy="user-profile">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-foreground"
              data-cy="sign-out-button"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden md:inline-block">Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;