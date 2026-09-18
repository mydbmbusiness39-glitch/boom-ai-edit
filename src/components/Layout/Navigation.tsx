import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Upload, Palette, Edit, Activity, Zap, Menu, Music, BarChart3, Bot, Building, Eye, Globe, Heart, HandHeart, Link2, Layers, LogOut, Monitor, Repeat, Scissors, Shield, Sparkles, Store, TrendingUp, Trophy, Users, Volume2, Brain } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  /** Compact label used ONLY below md, where the icon sits above the text. */
  mobileLabel?: string;
  icon: LucideIcon;
};

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Zap },
    { href: "/dashboard", label: "Dashboard", icon: Brain },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/repurpose", label: "Repurpose", icon: Repeat },
    { href: "/auto-music-sync", label: "Music Sync", mobileLabel: "Music", icon: Music },
    { href: "/clip-post", label: "Clip & Post", icon: Scissors },
    { href: "/auto-upload", label: "Auto Upload", icon: Link2 },
    { href: "/ai-studio", label: "AI Studio", icon: Brain },
    { href: "/twin", label: "AI Twin", mobileLabel: "Twin", icon: Bot },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/editor", label: "Editor", icon: Edit },
    { href: "/status", label: "Status", icon: Activity },
    { href: "/pricing", label: "Pricing", icon: Store },
  ];

  return (
    <nav className="flex items-center justify-between w-full gap-2 md:gap-0 p-4 bg-card border-b border-border">
      <div className="flex items-center space-x-2 shrink-0">
        <div className="relative">
          <Zap className="h-8 w-8 text-boom-primary" />
          <div className="absolute inset-0 h-8 w-8 text-boom-primary animate-pulse opacity-50" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
          BoomStudio
        </span>
      </div>

      <div className="flex items-center space-x-1 min-w-0 flex-1 overflow-x-auto overscroll-x-contain md:flex-none md:overflow-visible">
        {navItems.map(({ href, label, mobileLabel, icon: Icon }) => {
          const isActive = location.pathname === href;
          
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex flex-col md:flex-row items-center justify-center md:justify-start shrink-0",
                "gap-0.5 md:gap-0 md:space-x-2",
                "min-w-[3.75rem] md:min-w-0 px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-all duration-300",
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
                "h-4 w-4 shrink-0",
                isActive && "text-primary"
              )} />
              <span className="md:hidden text-[11px] font-medium leading-tight whitespace-nowrap text-center">
                {mobileLabel ?? label}
              </span>
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