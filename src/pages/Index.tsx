import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Palette, Edit, Activity, Zap, Play, Sparkles, ArrowRight, LogOut, TrendingUp, Users, Scissors, Layers, Link2, Volume2, Bot, Monitor, Brain } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import Layout from "@/components/Layout/Layout";

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
      <div className="min-h-[calc(100vh-80px)] bg-background">
        {/* Hero Section with BOOM Gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #8A2BE2, #FF3131, #1A1A1A)' }} />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative container max-w-6xl mx-auto px-6 pt-20 pb-32">
            <div className="text-center space-y-8">
              <div className="relative inline-block">
                <div className="absolute -inset-6 bg-gradient-to-r from-electric-purple via-neon-red to-aqua-cyan rounded-full blur-2xl opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-r from-electric-purple to-neon-red bg-clip-text text-transparent">
                  <Sparkles className="relative h-24 w-24 mx-auto text-electric-purple" />
                </div>
              </div>
              
              <h1 className="font-montserrat text-6xl md:text-8xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-electric-purple via-neon-red to-aqua-cyan bg-clip-text text-transparent">
                  BOOM Studio
                </span>
              </h1>
              
              <div className="font-poppins text-2xl md:text-3xl font-semibold text-vibrant-yellow mb-6">
                Pro edits. One tap.
              </div>
              
              <p className="font-poppins text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Transform your videos with cutting-edge AI technology. 
                Professional editing made simple with intelligent automation.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                {user ? (
                  <>
                    <Link to="/upload">
                      <Button 
                        size="lg"
                        className="bg-neon-red hover:bg-neon-red/90 text-white hover:shadow-lg hover:shadow-neon-red/50 px-8 py-4 text-lg font-poppins font-semibold transition-all duration-300"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start Creating Now
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="border-electric-purple/50 hover:border-electric-purple hover:bg-electric-purple/10 text-electric-purple px-8 py-4 text-lg font-poppins"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button 
                        size="lg"
                        className="bg-neon-red hover:bg-neon-red/90 text-white hover:shadow-lg hover:shadow-neon-red/50 px-8 py-4 text-lg font-poppins font-semibold transition-all duration-300"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start Creating Now
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="bg-electric-purple hover:bg-electric-purple/90 text-white border-electric-purple hover:shadow-lg hover:shadow-electric-purple/50 px-8 py-4 text-lg font-poppins font-semibold transition-all duration-300"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Watch Demo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

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
                        <div className="absolute -inset-2 bg-gradient-to-r from-neon-purple to-neon-green rounded-full blur opacity-0 group-hover:opacity-20 transition-opacity" />
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
