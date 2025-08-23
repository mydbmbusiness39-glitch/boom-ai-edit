import Layout from '@/components/Layout/Layout';
import { ChallengesCard } from '@/components/Gamification/ChallengesCard';
import { LeaderboardCard } from '@/components/Gamification/LeaderboardCard';
import { AchievementsCard } from '@/components/Gamification/AchievementsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Target, Star, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  total_points: number;
  current_streak: number;
  level: number;
  badges_earned: number;
  challenges_completed: number;
  total_uploads: number;
}

const Community = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    total_points: 0,
    current_streak: 0,
    level: 1,
    badges_earned: 0,
    challenges_completed: 0,
    total_uploads: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUserStats(data);
      } else {
        // Create initial gamification record
        const { data: newStats, error: insertError } = await supabase
          .from('user_gamification')
          .insert({ user_id: user!.id })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newStats) setUserStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const getExperienceProgress = () => {
    const baseXP = 1000;
    const nextLevelXP = baseXP * userStats.level;
    return Math.min((userStats.total_points % nextLevelXP) / nextLevelXP * 100, 100);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Community Hub
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join challenges, compete on leaderboards, and earn achievements. 
              Build your creator reputation and unlock exclusive rewards!
            </p>
          </div>

          {/* User Stats Overview */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/5 to-pink-500/10" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Your Creator Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{userStats.level}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-yellow-500/10 w-fit mx-auto">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-500">{userStats.total_points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-orange-500/10 w-fit mx-auto">
                    <Target className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-500">{userStats.current_streak}</p>
                    <p className="text-xs text-muted-foreground">Day Streak</p>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-purple-500/10 w-fit mx-auto">
                    <Award className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-500">{userStats.badges_earned}</p>
                    <p className="text-xs text-muted-foreground">Badges</p>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-green-500/10 w-fit mx-auto">
                    <Target className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">{userStats.challenges_completed}</p>
                    <p className="text-xs text-muted-foreground">Challenges</p>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-blue-500/10 w-fit mx-auto">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-500">{userStats.total_uploads}</p>
                    <p className="text-xs text-muted-foreground">Uploads</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress to Level {userStats.level + 1}</span>
                  <span>{Math.round(getExperienceProgress())}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getExperienceProgress()}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Challenges */}
            <div className="xl:col-span-1 space-y-6">
              <ChallengesCard />
            </div>

            {/* Middle Column - Leaderboard */}
            <div className="xl:col-span-1">
              <LeaderboardCard />
            </div>

            {/* Right Column - Achievements */}
            <div className="xl:col-span-1">
              <AchievementsCard />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;