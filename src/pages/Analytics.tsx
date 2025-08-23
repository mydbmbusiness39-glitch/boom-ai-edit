import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  Share, 
  MessageCircle, 
  DollarSign, 
  Users, 
  Clock, 
  Target,
  Zap,
  Award,
  BarChart3,
  LineChart,
  PieChart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface ClipPerformance {
  id: string;
  clip_title: string;
  platform: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagement_rate: number;
  viral_prediction_score: number;
  posted_at: string;
}

interface CreatorStats {
  followers_count: number;
  total_videos: number;
  total_views: number;
  total_likes: number;
  engagement_rate: number;
  estimated_revenue: number;
  viral_clips_count: number;
}

const Analytics = () => {
  const [clips, setClips] = useState<ClipPerformance[]>([]);
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [timeRange, setTimeRange] = useState("7days");
  const [viralInsights, setViralInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPlatform, timeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadClipPerformances(),
        loadCreatorStats(),
        loadViralInsights()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClipPerformances = async () => {
    try {
      let query = supabase
        .from('clip_performances')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(50);

      if (selectedPlatform !== "all") {
        query = query.eq('platform', selectedPlatform);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Mock data if no real data exists
      if (!data || data.length === 0) {
        const mockClips: ClipPerformance[] = [
          {
            id: '1',
            clip_title: 'Epic Gaming Moment',
            platform: 'tiktok',
            views: 45600,
            likes: 3200,
            shares: 180,
            comments: 240,
            engagement_rate: 7.2,
            viral_prediction_score: 8.5,
            posted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2', 
            clip_title: 'Productivity Hack',
            platform: 'youtube_shorts',
            views: 23400,
            likes: 1800,
            shares: 95,
            comments: 156,
            engagement_rate: 8.9,
            viral_prediction_score: 7.3,
            posted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            clip_title: 'Cooking Tutorial',
            platform: 'instagram_reels',
            views: 67800,
            likes: 4500,
            shares: 320,
            comments: 410,
            engagement_rate: 7.8,
            viral_prediction_score: 9.1,
            posted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        setClips(mockClips);
      } else {
        setClips(data);
      }
    } catch (error) {
      console.error('Error loading clip performances:', error);
    }
  };

  const loadCreatorStats = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_analytics')
        .select('*')
        .eq('platform', 'all')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Mock data if no real data exists
      if (!data) {
        const mockStats: CreatorStats = {
          followers_count: 12500,
          total_videos: 45,
          total_views: 890000,
          total_likes: 67500,
          engagement_rate: 7.8,
          estimated_revenue: 1250.00,
          viral_clips_count: 8
        };
        setCreatorStats(mockStats);
      } else {
        setCreatorStats(data);
      }
    } catch (error) {
      console.error('Error loading creator stats:', error);
    }
  };

  const loadViralInsights = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('viral-predictor', {
        body: { action: 'get_insights' }
      });

      if (error) throw error;
      
      setViralInsights(data || {
        recent_insights: [],
        performance_summary: {
          total_clips: 3,
          avg_viral_score: 8.3,
          best_performing_platform: 'tiktok',
          total_views: 136800
        },
        trending_factors: [
          'Short-form vertical content',
          'Trending audio usage',
          'Hook within 3 seconds',
          'Clear call-to-action'
        ]
      });
    } catch (error) {
      console.error('Error loading viral insights:', error);
    }
  };

  const predictViralScore = async (clipTitle: string, platform: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('viral-predictor', {
        body: {
          action: 'predict_viral_score',
          clip_data: {
            title: clipTitle,
            platform: platform,
            duration: 30,
            hashtags: ['trending', 'viral', 'creator']
          },
          user_context: {
            follower_count: creatorStats?.followers_count || 0,
            average_engagement_rate: creatorStats?.engagement_rate || 0
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Viral Prediction Generated",
        description: `Viral Score: ${data.viral_prediction_score}/100 (${data.confidence_level * 100}% confidence)`,
      });

      return data;
    } catch (error) {
      console.error('Error predicting viral score:', error);
      toast({
        title: "Prediction Failed",
        description: "Could not generate viral prediction",
        variant: "destructive"
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getViralScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <BarChart3 className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              Creator Analytics
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Track performance, predict viral content, and grow your audience
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube_shorts">YouTube Shorts</SelectItem>
                <SelectItem value="instagram_reels">Instagram Reels</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={loadAnalyticsData}
            className="bg-gradient-to-r from-neon-purple to-neon-green text-background"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="viral-insights">Viral Insights</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(creatorStats?.total_views || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Followers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(creatorStats?.followers_count || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +8% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {creatorStats?.engagement_rate?.toFixed(1) || '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +2.3% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${creatorStats?.estimated_revenue?.toFixed(0) || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +15% from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Clips Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Clips Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clips.slice(0, 5).map((clip) => (
                    <div key={clip.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{clip.clip_title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span className="capitalize">{clip.platform.replace('_', ' ')}</span>
                          <span>{formatNumber(clip.views)} views</span>
                          <span>{formatNumber(clip.likes)} likes</span>
                          <span>{clip.engagement_rate.toFixed(1)}% engagement</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          <Target className="h-3 w-3 mr-1" />
                          Viral Score: {clip.viral_prediction_score.toFixed(1)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => predictViralScore(clip.clip_title, clip.platform)}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Predict
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Clips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clips
                      .sort((a, b) => b.views - a.views)
                      .slice(0, 8)
                      .map((clip, index) => (
                        <div key={clip.id} className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{clip.clip_title}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{formatNumber(clip.views)} views</span>
                              <span>•</span>
                              <span className={getViralScoreColor(clip.viral_prediction_score)}>
                                {clip.viral_prediction_score.toFixed(1)} viral score
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {clip.platform.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['tiktok', 'youtube_shorts', 'instagram_reels'].map((platform) => {
                      const platformClips = clips.filter(c => c.platform === platform);
                      const totalViews = platformClips.reduce((sum, c) => sum + c.views, 0);
                      const avgEngagement = platformClips.reduce((sum, c) => sum + c.engagement_rate, 0) / platformClips.length || 0;
                      
                      return (
                        <div key={platform} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{platform.replace('_', ' ')}</span>
                            <span>{formatNumber(totalViews)} views</span>
                          </div>
                          <Progress value={(totalViews / Math.max(...clips.map(c => c.views))) * 100} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{platformClips.length} clips</span>
                            <span>{avgEngagement.toFixed(1)}% avg engagement</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Clips Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {clips.map((clip) => (
                    <div key={clip.id} className="grid grid-cols-8 gap-4 items-center p-3 border rounded text-sm">
                      <div className="col-span-2">
                        <p className="font-medium truncate">{clip.clip_title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {clip.platform.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-center">{formatNumber(clip.views)}</div>
                      <div className="text-center">{formatNumber(clip.likes)}</div>
                      <div className="text-center">{formatNumber(clip.shares)}</div>
                      <div className="text-center">{formatNumber(clip.comments)}</div>
                      <div className="text-center">{clip.engagement_rate.toFixed(1)}%</div>
                      <div className="text-center">
                        <span className={getViralScoreColor(clip.viral_prediction_score)}>
                          {clip.viral_prediction_score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Viral Insights Tab */}
          <TabsContent value="viral-insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Viral Prediction Engine</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-green-500">
                        {viralInsights?.performance_summary?.avg_viral_score?.toFixed(1) || '8.3'}
                      </div>
                      <p className="text-xs text-muted-foreground">Avg Viral Score</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-blue-500">
                        {viralInsights?.performance_summary?.total_clips || '3'}
                      </div>
                      <p className="text-xs text-muted-foreground">Analyzed Clips</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-purple-500">
                        {creatorStats?.viral_clips_count || '2'}
                      </div>
                      <p className="text-xs text-muted-foreground">Viral Hits</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Trending Factors</h4>
                    {(viralInsights?.trending_factors || []).map((factor: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-2">High Viral Potential</h5>
                      <p className="text-sm text-green-700">
                        Your content shows strong viral indicators. Focus on:
                      </p>
                      <ul className="text-xs text-green-600 mt-2 space-y-1">
                        <li>• Post during peak hours (7-9 PM)</li>
                        <li>• Use trending audio tracks</li>
                        <li>• Include strong hooks in first 3 seconds</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-2">Platform Optimization</h5>
                      <p className="text-sm text-blue-700">
                        Best performing platform: {viralInsights?.performance_summary?.best_performing_platform || 'TikTok'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Consider creating more content for this platform
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                      <h5 className="font-medium text-yellow-800 mb-2">Growth Opportunity</h5>
                      <p className="text-sm text-yellow-700">
                        Consistency is key. Aim for 3-5 posts per week.
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Your engagement rate is {creatorStats?.engagement_rate?.toFixed(1) || '7.8'}% - above average!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Growth Tab */}
          <TabsContent value="growth" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Growth Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Follower Growth</p>
                        <p className="text-2xl font-bold">{formatNumber(creatorStats?.followers_count || 0)}</p>
                        <Progress value={75} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">+8% this week</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Total Watch Time</p>
                        <p className="text-2xl font-bold">156h</p>
                        <Progress value={60} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">+12% this week</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue Growth</p>
                        <p className="text-2xl font-bold">${creatorStats?.estimated_revenue?.toFixed(0) || '0'}</p>
                        <Progress value={45} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">+15% this month</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Viral Success Rate</p>
                        <p className="text-2xl font-bold">{((creatorStats?.viral_clips_count || 0) / (creatorStats?.total_videos || 1) * 100).toFixed(1)}%</p>
                        <Progress value={35} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">Above average</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Goals & Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">10K Followers</span>
                        <span className="text-xs text-muted-foreground">80%</span>
                      </div>
                      <Progress value={80} />
                      <p className="text-xs text-muted-foreground mt-1">2K more to go!</p>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">1M Total Views</span>
                        <span className="text-xs text-muted-foreground">89%</span>
                      </div>
                      <Progress value={89} />
                      <p className="text-xs text-muted-foreground mt-1">110K more to go!</p>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">$2K Monthly Revenue</span>
                        <span className="text-xs text-muted-foreground">62%</span>
                      </div>
                      <Progress value={62} />
                      <p className="text-xs text-muted-foreground mt-1">$750 more to go!</p>
                    </div>

                    <Button className="w-full mt-4 bg-gradient-to-r from-neon-purple to-neon-green text-background">
                      <Target className="h-4 w-4 mr-2" />
                      Set New Goal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Analytics;