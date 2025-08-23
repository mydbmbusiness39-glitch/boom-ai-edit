import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Medal, Award, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';

interface Achievement {
  id: string;
  title: string;
  description: string;
  badge_icon: string;
  badge_color: string;
  rarity: string;
  points: number;
  earned_at?: string;
  is_earned: boolean;
}

export const AchievementsCard = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      // Get all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: false });

      if (achievementsError) throw achievementsError;

      // Get user's earned achievements
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user!.id);

      if (userError) throw userError;

      // Merge data
      const achievementsWithProgress = achievementsData.map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
        return {
          ...achievement,
          is_earned: !!userAchievement,
          earned_at: userAchievement?.earned_at
        };
      });

      setAchievements(achievementsWithProgress);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-500';
      case 'rare':
        return 'bg-blue-500';
      case 'epic':
        return 'bg-purple-500';
      case 'legendary':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return <Medal className="h-4 w-4" />;
      case 'rare':
        return <Star className="h-4 w-4" />;
      case 'epic':
        return <Award className="h-4 w-4" />;
      case 'legendary':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Medal className="h-4 w-4" />;
    }
  };

  const earnedCount = achievements.filter(a => a.is_earned).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-2" />
                <div className="h-3 bg-muted rounded" />
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
            <Trophy className="h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
          <Badge variant="outline">
            {earnedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {achievements.map(achievement => (
            <div 
              key={achievement.id}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                achievement.is_earned
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-muted bg-muted/20 grayscale opacity-60'
              }`}
            >
              <div className="text-center space-y-2">
                <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full ${
                  achievement.is_earned ? getRarityColor(achievement.rarity) : 'bg-muted'
                } text-white`}>
                  {achievement.is_earned ? (
                    getRarityIcon(achievement.rarity)
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  
                  {achievement.is_earned && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Trophy className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm">{achievement.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getRarityColor(achievement.rarity)} text-white border-0`}
                    >
                      {achievement.rarity}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {achievement.points} pts
                    </span>
                  </div>
                  
                  {achievement.is_earned && achievement.earned_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Earned {new Date(achievement.earned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};