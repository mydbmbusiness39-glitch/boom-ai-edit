import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, Crown, Medal, Award, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  total_views: number;
  total_likes: number;
  viral_clips_count: number;
  rank_position: number;
  points: number;
  user_email?: string;
}

export const LeaderboardCard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      const currentDate = new Date();
      const periodStart = period === 'weekly' 
        ? new Date(currentDate.setDate(currentDate.getDate() - 7))
        : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      const { data: leaderboardData, error } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('period_type', period)
        .gte('period_start', periodStart.toISOString().split('T')[0])
        .order('rank_position', { ascending: true })
        .limit(10);

      if (error) throw error;

      // Get user emails separately
      const userIds = leaderboardData.map(entry => entry.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const leaderboardWithEmails = leaderboardData.map(entry => {
        const profile = profilesData?.find(p => p.id === entry.user_id);
        return {
          ...entry,
          user_email: profile?.email
        };
      });

      setLeaderboard(leaderboardWithEmails);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-semibold">#{rank}</span>;
    }
  };

  const getUserInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Viral Creators Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-1" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Viral Creators Leaderboard
          </CardTitle>
          <div className="flex gap-2">
            <Badge 
              variant={period === 'weekly' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPeriod('weekly')}
            >
              Weekly
            </Badge>
            <Badge 
              variant={period === 'monthly' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No leaderboard data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start posting viral clips to appear here!
              </p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank_position || index + 1)}
                </div>
                
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(entry.user_email || '')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {entry.user_email?.split('@')[0] || 'Anonymous'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatNumber(entry.total_views)} views</span>
                    <span>{formatNumber(entry.total_likes)} likes</span>
                    <span>{entry.viral_clips_count} viral clips</span>
                  </div>
                </div>
                
                <Badge variant="secondary">
                  {formatNumber(entry.points)} pts
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};