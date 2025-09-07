import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Brain,
  Clock,
  TrendingUp, 
  Users, 
  Globe,
  Zap,
  Target,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Calendar,
  MessageSquare,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface AISuggestion {
  type: 'timing' | 'content' | 'audience' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  metric?: string;
  improvement?: string;
}

interface DashboardMetrics {
  totalViews: number;
  avgEngagement: number;
  followerGrowth: number;
  revenueThisMonth: number;
  topPerformingHour: number;
  audienceLanguages: { [key: string]: number };
  trendingTopics: string[];
}

const Dashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalViews: 0,
    avgEngagement: 0,
    followerGrowth: 0,
    revenueThisMonth: 0,
    topPerformingHour: 19,
    audienceLanguages: { english: 60, spanish: 40 },
    trendingTopics: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load analytics data
      const { data: clipData } = await supabase
        .from('clip_performances')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: creatorData } = await supabase
        .from('creator_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      // Calculate metrics
      if (clipData && clipData.length > 0) {
        const totalViews = clipData.reduce((sum, clip) => sum + (clip.views || 0), 0);
        const avgEngagement = clipData.reduce((sum, clip) => sum + (clip.engagement_rate || 0), 0) / clipData.length;
        
        setMetrics(prev => ({
          ...prev,
          totalViews,
          avgEngagement: avgEngagement * 100
        }));
      }

      // Generate AI suggestions
      await generateAISuggestions(clipData || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async (clipData: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-suggestions', {
        body: {
          clipData,
          metrics
        }
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      // Fallback to mock suggestions
      setSuggestions([
        {
          type: 'timing',
          title: 'Post more at 7pm EST',
          description: 'Your fans spike here with 3.2x higher engagement rates',
          confidence: 92,
          priority: 'high',
          actionable: true,
          metric: '3.2x engagement',
          improvement: '+240% views'
        },
        {
          type: 'content',
          title: 'Try Spanish captions',
          description: '40% of your audience is bilingual and Spanish content gets 60% more shares',
          confidence: 85,
          priority: 'high',
          actionable: true,
          metric: '40% bilingual audience',
          improvement: '+60% shares'
        },
        {
          type: 'audience',
          title: 'Target Gen Z morning routines',
          description: 'Your 18-24 audience is most active during 6-9am posting morning content',
          confidence: 78,
          priority: 'medium',
          actionable: true,
          metric: '18-24 demographic',
          improvement: '+85% morning engagement'
        },
        {
          type: 'optimization',
          title: 'Use trending audio #viral2024',
          description: 'This audio track is trending +340% and matches your niche perfectly',
          confidence: 91,
          priority: 'high',
          actionable: true,
          metric: '+340% trend growth',
          improvement: 'Viral potential boost'
        }
      ]);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'timing': return Clock;
      case 'content': return MessageSquare;
      case 'audience': return Users;
      case 'optimization': return Target;
      default: return Lightbulb;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              AI Creator Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Smart insights to scale your content strategy
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgEngagement.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">+2.3% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follower Growth</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{metrics.followerGrowth}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.revenueThisMonth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Smart Recommendations
            </h2>
            <Button 
              variant="outline" 
              onClick={() => generateAISuggestions([])}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Refresh Insights
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suggestions.map((suggestion, index) => {
              const Icon = getSuggestionIcon(suggestion.type);
              return (
                <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{suggestion.title}</CardTitle>
                          <Badge 
                            variant="secondary" 
                            className={`mt-1 ${getPriorityColor(suggestion.priority)} text-xs`}
                          >
                            {suggestion.priority} priority
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{suggestion.confidence}%</div>
                        <div className="text-xs text-muted-foreground">confidence</div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{suggestion.description}</p>
                    
                    {suggestion.metric && suggestion.improvement && (
                      <div className="flex justify-between items-center bg-muted/50 rounded-lg p-3">
                        <div>
                          <div className="text-sm font-medium">{suggestion.metric}</div>
                          <div className="text-xs text-muted-foreground">Current metric</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium text-green-600">{suggestion.improvement}</div>
                          <div className="text-xs text-muted-foreground">Potential gain</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Progress value={suggestion.confidence} className="flex-1 mr-4" />
                      {suggestion.actionable && (
                        <Button size="sm" className="flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          Apply
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Peak Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">7-9 PM EST</span>
                  <Badge variant="secondary">Peak</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">6-8 AM EST</span>
                  <Badge variant="outline">Good</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">12-2 PM EST</span>
                  <Badge variant="outline">Average</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Audience Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">English</span>
                    <span className="text-sm font-medium">60%</span>
                  </div>
                  <Progress value={60} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">Spanish</span>
                    <span className="text-sm font-medium">40%</span>
                  </div>
                  <Progress value={40} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trending Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="secondary">#MorningRoutine</Badge>
                <Badge variant="secondary">#ProductivityHacks</Badge>
                <Badge variant="secondary">#BehindTheScenes</Badge>
                <Badge variant="secondary">#TechReviews</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;