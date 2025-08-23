-- Create challenges system
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'weekly', -- weekly, daily, monthly
  goal_count INTEGER NOT NULL DEFAULT 5,
  reward_type TEXT NOT NULL DEFAULT 'template', -- template, badge, credits
  reward_data JSONB DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User challenge progress
CREATE TABLE public.user_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT false,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Achievements and badges
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_icon TEXT NOT NULL DEFAULT 'trophy',
  badge_color TEXT NOT NULL DEFAULT '#FFD700',
  achievement_type TEXT NOT NULL DEFAULT 'milestone', -- milestone, streak, viral, social
  criteria JSONB NOT NULL DEFAULT '{}',
  rarity TEXT NOT NULL DEFAULT 'common', -- common, rare, epic, legendary
  points INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_data JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

-- Leaderboards (monthly viral clips)
CREATE TABLE public.leaderboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- weekly, monthly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  viral_clips_count INTEGER DEFAULT 0,
  top_clip_id UUID,
  rank_position INTEGER,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_type, period_start)
);

-- User gamification stats
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_uploads INTEGER DEFAULT 0,
  total_viral_clips INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  badges_earned INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenges (public read, admin write)
CREATE POLICY "Anyone can view active challenges" ON public.challenges
  FOR SELECT USING (is_active = true);

-- RLS Policies for user_challenges
CREATE POLICY "Users can view their own challenge progress" ON public.user_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenge progress" ON public.user_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress" ON public.user_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for achievements (public read)
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (is_active = true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for leaderboards (public read)
CREATE POLICY "Anyone can view leaderboards" ON public.leaderboards
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own leaderboard entry" ON public.leaderboards
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_gamification
CREATE POLICY "Users can view their own gamification stats" ON public.user_gamification
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own gamification stats" ON public.user_gamification
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_challenges_updated_at
  BEFORE UPDATE ON public.user_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboards_updated_at
  BEFORE UPDATE ON public.leaderboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_gamification_updated_at
  BEFORE UPDATE ON public.user_gamification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial challenges
INSERT INTO public.challenges (title, description, goal_count, reward_type, reward_data, end_date) VALUES
('Weekly Creator Challenge', 'Post 5 clips this week to unlock bonus templates', 5, 'template', '{"template_ids": ["premium-1", "premium-2"], "template_names": ["Viral Intro Pack", "Trending Outro Set"]}', CURRENT_DATE + INTERVAL '7 days'),
('Viral Streak', 'Create 3 viral clips (>10K views) this month', 3, 'badge', '{"badge_id": "viral-master", "badge_name": "Viral Master"}', CURRENT_DATE + INTERVAL '30 days'),
('Community Engagement', 'Get 100 total likes across your clips this week', 100, 'credits', '{"credits": 500, "bonus_type": "engagement"}', CURRENT_DATE + INTERVAL '7 days');

-- Insert initial achievements
INSERT INTO public.achievements (title, description, badge_icon, badge_color, achievement_type, criteria, rarity, points) VALUES
('First Upload', 'Upload your first video', 'upload', '#3B82F6', 'milestone', '{"uploads": 1}', 'common', 100),
('Viral Sensation', 'Get 100K+ views on a single clip', 'trending-up', '#F59E0B', 'viral', '{"views": 100000}', 'epic', 1000),
('Consistency King', 'Upload for 7 days in a row', 'calendar', '#10B981', 'streak', '{"streak_days": 7}', 'rare', 500),
('Community Favorite', 'Get 1K likes on a single clip', 'heart', '#EF4444', 'social', '{"likes": 1000}', 'rare', 300),
('Template Master', 'Complete 5 weekly challenges', 'award', '#8B5CF6', 'milestone', '{"challenges": 5}', 'legendary', 2000);