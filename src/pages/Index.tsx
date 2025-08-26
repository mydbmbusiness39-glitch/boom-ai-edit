import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Palette, Edit, Activity, Zap, Play, Sparkles, ArrowRight, LogOut, TrendingUp, Users, Scissors, Layers, Link2, Volume2, Bot, Monitor, Brain } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import Layout from "@/components/Layout/Layout";
import Hero from "@/components/Hero";

const Index = () => {
  const { user, signOut } = useAuth();

  const features = [
    {
      icon: Upload,
      title: "Upload Media",
      description: "Import videos, images, and audio files to start your project",
      href: "/upload"
    },
    {
      icon: Palette,
      title: "AI Style Transfer",
      description: "Apply stunning AI-powered visual effects and color grading",
      href: "/style"
    },
    {
      icon: Edit,
      title: "Timeline Editor",
      description: "Professional video editing with intuitive timeline controls",
      href: "/editor"
    },
    {
      icon: Sparkles,
      title: "AI Script Generator",
      description: "Turn your videos into viral hooks and engaging teasers",
      href: "/script-generator"
    },
    {
      icon: TrendingUp,
      title: "Trend Syncing",
      description: "Detect trending audio that fits your vibe and auto-match",
      href: "/trend-sync"
    },
    {
      icon: Users,
      title: "Community Collab",
      description: "Your AI twin co-stars with other users for viral crossovers",
      href: "/community-collab"
    },
    {
      icon: Scissors,
      title: "Clip & Post",
      description: "One-click clip extraction and instant social media posting",
      href: "/clip-post"
    },
    {
      icon: Layers,
      title: "Batch Processor",
      description: "Upload 10 videos → Generate 50 viral clips overnight",
      href: "/batch-processor"
    },
    {
      icon: Monitor,
      title: "Dynamic Overlays",
      description: "Your AI twin reacting in the corner while main video plays",
      href: "/dynamic-overlays"
    },
    {
      icon: Brain,
      title: "AI Studio",
      description: "Advanced script-to-video, viral optimization & trend analysis",
      href: "/ai-studio"
    },
    {
      icon: Activity,
      title: "Render Status",
      description: "Track your video processing progress in real-time",
      href: "/status/demo-job"
    }
  ];

  return (
    <Layout>
      <Hero />
      <div className="bg-background">
        {/* Features Grid */}
        <div className="container max-w-6xl mx-auto px-6 pb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need for professional video editing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link key={index} to={feature.href}>
                  <Card className="h-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/10 border-border hover:border-primary/50 group">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-r from-boom-primary to-boom-secondary rounded-full blur opacity-0 group-hover:opacity-20 transition-opacity" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-sm font-medium">Get Started</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
