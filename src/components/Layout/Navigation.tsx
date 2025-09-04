import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Upload, Palette, Edit, Activity, Zap, LogOut, Sparkles, TrendingUp, Users, Scissors, Layers, Link2, Volume2, Bot, Monitor, Brain, Store, BarChart3, HandHeart, Shield, Trophy, Eye, Globe, Heart, Building } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: Zap },
    { href: "/dashboard", label: "Dashboard", icon: Brain },
    { href: "/test-dashboard", label: "Test Dashboard", icon: Monitor },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/clip-post", label: "Clip & Post", icon: Scissors },
    { href: "/ai-studio", label: "AI Studio", icon: Brain },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/editor", label: "Editor", icon: Edit },
    { href: "/status", label: "Status", icon: Activity },
    { href: "/test-settings", label: "Test Settings", icon: Shield },
  ];

  return (
    <nav className="flex items-center justify-between w-full p-4 bg-card border-b border-border">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Zap className="h-8 w-8 text-boom-primary" />
          <div className="absolute inset-0 h-8 w-8 text-boom-primary animate-pulse opacity-50" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
          BoomStudio
        </span>
      </div>

      <div className="flex items-center space-x-1">
        {navItems.map(({ href, label, icon: Icon, badge }: any) => {
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
                "shadow-[0_0_20px_hsl(var(--boom-primary)/0.3)]",
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
              {badge && (
                <Badge variant="secondary" className="text-xs bg-boom-accent/20 text-boom-accent border-boom-accent/30">
                  {badge}
                </Badge>
              )}
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