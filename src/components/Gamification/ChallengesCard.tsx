import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Gift, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  goal_count: number;
  reward_type: string;
  reward_data: any;
  end_date: string;
  progress?: number;
  is_completed?: boolean;
  reward_claimed?: boolean;
}

export const ChallengesCard = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    try {
      // Get active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0]);

      if (challengesError) throw challengesError;

      // Get user progress for each challenge
      const { data: progressData, error: progressError } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user!.id);

      if (progressError) throw progressError;

      // Merge challenge data with progress
      const challengesWithProgress = challengesData.map(challenge => {
        const userProgress = progressData.find(p => p.challenge_id === challenge.id);
        return {
          ...challenge,
          progress: userProgress?.progress || 0,
          is_completed: userProgress?.is_completed || false,
          reward_claimed: userProgress?.reward_claimed || false
        };
      });

      setChallenges(challengesWithProgress);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from('user_challenges')
        .update({ reward_claimed: true })
        .eq('user_id', user!.id)
        .eq('challenge_id', challengeId);

      if (error) throw error;

      toast.success('Reward claimed successfully!');
      fetchChallenges();
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    }
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'template':
        return <Target className="h-4 w-4" />;
      case 'badge':
        return <Trophy className="h-4 w-4" />;
      case 'credits':
        return <Gift className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Active Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-2 bg-muted rounded" />
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
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Active Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {challenges.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active challenges at the moment</p>
            </div>
          ) : (
            challenges.map(challenge => (
              <div key={challenge.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{challenge.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {challenge.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Ends: {new Date(challenge.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getRewardIcon(challenge.reward_type)}
                    {challenge.reward_type}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{challenge.progress}/{challenge.goal_count}</span>
                  </div>
                  <Progress 
                    value={(challenge.progress / challenge.goal_count) * 100} 
                    className="h-2"
                  />
                </div>

                {challenge.is_completed && !challenge.reward_claimed && (
                  <Button 
                    onClick={() => claimReward(challenge.id)}
                    className="w-full"
                    variant="default"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Claim Reward
                  </Button>
                )}

                {challenge.is_completed && challenge.reward_claimed && (
                  <Button variant="outline" className="w-full" disabled>
                    <Trophy className="h-4 w-4 mr-2" />
                    Reward Claimed
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};