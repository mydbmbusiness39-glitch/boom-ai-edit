import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { 
  Handshake, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2, 
  Star, 
  Eye, 
  Clock,
  Plus,
  Search,
  Filter,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Target,
  Zap
} from "lucide-react";

interface BrandProfile {
  id: string;
  company_name: string;
  company_description?: string;
  logo_url?: string;
  industry: string;
  verification_status: string;
  avg_rating: number;
  deals_completed: number;
  total_spent: number;
}

interface SponsorshipOpportunity {
  id: string;
  title: string;
  description: string;
  budget: number;
  campaign_type: string;
  deadline?: string;
  platforms: any; // JSON field from Supabase
  status: string;
  applications_count: number;
  brand_profiles: BrandProfile;
}

interface SponsorshipDeal {
  id: string;
  deal_amount: number;
  creator_payout: number;
  platform_fee: number;
  status: string;
  deadline: string;
  brand_approval_status: string;
  payment_status: string;
  brand_profiles: {
    id: string;
    company_name: string;
    logo_url?: string;
  };
  sponsorship_opportunities: {
    id: string;
    title: string;
    campaign_type: string;
  };
}

interface BrandMatch {
  id: string;
  match_score: number;
  match_reasons: any; // JSON field from Supabase
  status: string;
  created_at: string;
  brand_profiles: BrandProfile;
  sponsorship_opportunities?: {
    id: string;
    title: string;
    budget: number;
    campaign_type: string;
  };
}

export default function BrandMarketplace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("opportunities");
  const [opportunities, setOpportunities] = useState<SponsorshipOpportunity[]>([]);
  const [myDeals, setMyDeals] = useState<SponsorshipDeal[]>([]);
  const [brandMatches, setBrandMatches] = useState<BrandMatch[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");

  // Form states
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [showCreateOpportunity, setShowCreateOpportunity] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SponsorshipOpportunity | null>(null);

  const [newBrand, setNewBrand] = useState({
    company_name: "",
    company_description: "",
    industry: "",
    website_url: "",
    budget_range: "negotiable",
    contact_email: "",
    contact_person: ""
  });

  const [newOpportunity, setNewOpportunity] = useState({
    title: "",
    description: "",
    campaign_type: "sponsored_post",
    budget: 0,
    deadline: "",
    platforms: ["tiktok"],
    target_views: 0,
    target_engagement_rate: 0
  });

  const [application, setApplication] = useState({
    pitch_message: "",
    proposed_rate: 0,
    portfolio_links: [""]
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sponsorship opportunities
      const { data: opportunitiesData } = await supabase
        .from('sponsorship_opportunities')
        .select(`
          *,
          brand_profiles (
            id,
            company_name,
            logo_url,
            industry,
            verification_status,
            avg_rating,
            deals_completed,
            total_spent
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (opportunitiesData) setOpportunities(opportunitiesData as any);

      // Fetch user's brand profile
      const { data: brandData } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (brandData) {
        setBrandProfile(brandData);
        setActiveTab("brand-dashboard");
      }

      // Fetch user's deals
      const { data: dealsData } = await supabase
        .from('sponsorship_deals')
        .select(`
          *,
          brand_profiles (
            id,
            company_name,
            logo_url
          ),
          sponsorship_opportunities (
            id,
            title,
            campaign_type
          )
        `)
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (dealsData) setMyDeals(dealsData);

      // Fetch brand matches for creator
      const { data: matchesData } = await supabase
        .from('brand_creator_matches')
        .select(`
          *,
          brand_profiles (
            id,
            company_name,
            logo_url,
            industry,
            verification_status,
            avg_rating,
            deals_completed,
            total_spent
          ),
          sponsorship_opportunities (
            id,
            title,
            budget,
            campaign_type
          )
        `)
        .eq('creator_id', user?.id)
        .eq('status', 'suggested')
        .order('match_score', { ascending: false });

      if (matchesData) setBrandMatches(matchesData as any);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrandProfile = async () => {
    if (!newBrand.company_name || !newBrand.industry) {
      toast.error('Company name and industry are required');
      return;
    }

    try {
      const { error } = await supabase.from('brand_profiles').insert([{
        ...newBrand,
        user_id: user?.id
      }]);

      if (error) throw error;

      toast.success('Brand profile created successfully');
      setNewBrand({
        company_name: "",
        company_description: "",
        industry: "",
        website_url: "",
        budget_range: "negotiable",
        contact_email: "",
        contact_person: ""
      });
      setShowCreateBrand(false);
      fetchData();
    } catch (error) {
      console.error('Error creating brand profile:', error);
      toast.error('Failed to create brand profile');
    }
  };

  const handleCreateOpportunity = async () => {
    if (!brandProfile) {
      toast.error('Please create a brand profile first');
      return;
    }

    if (!newOpportunity.title || !newOpportunity.description || newOpportunity.budget <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('sponsorship_opportunities').insert([{
        ...newOpportunity,
        brand_id: brandProfile.id,
        platforms: JSON.stringify(newOpportunity.platforms)
      }]);

      if (error) throw error;

      toast.success('Sponsorship opportunity created successfully');
      setNewOpportunity({
        title: "",
        description: "",
        campaign_type: "sponsored_post",
        budget: 0,
        deadline: "",
        platforms: ["tiktok"],
        target_views: 0,
        target_engagement_rate: 0
      });
      setShowCreateOpportunity(false);
      fetchData();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast.error('Failed to create opportunity');
    }
  };

  const handleApplyToOpportunity = async () => {
    if (!selectedOpportunity || !application.pitch_message) {
      toast.error('Please fill in your pitch message');
      return;
    }

    try {
      const { error } = await supabase.from('sponsorship_applications').insert([{
        opportunity_id: selectedOpportunity.id,
        creator_id: user?.id,
        pitch_message: application.pitch_message,
        proposed_rate: application.proposed_rate || null,
        portfolio_links: JSON.stringify(application.portfolio_links.filter(link => link.trim()))
      }]);

      if (error) throw error;

      toast.success('Application submitted successfully');
      setApplication({
        pitch_message: "",
        proposed_rate: 0,
        portfolio_links: [""]
      });
      setShowApplicationModal(false);
      setSelectedOpportunity(null);
    } catch (error) {
      console.error('Error applying to opportunity:', error);
      toast.error('Failed to submit application');
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.brand_profiles.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === "all" || opportunity.brand_profiles.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'sponsored_post': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'product_placement': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'brand_mention': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'full_campaign': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'affiliate': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'completed': return 'text-blue-600';
      case 'rejected':
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Brand Marketplace
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect with brands for sponsorship opportunities and revenue sharing
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
            <p className="text-xs text-muted-foreground">Available sponsorships</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Deals</CardTitle>
            <Handshake className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myDeals.length}</div>
            <p className="text-xs text-muted-foreground">Active & completed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brand Matches</CardTitle>
            <Zap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brandMatches.length}</div>
            <p className="text-xs text-muted-foreground">AI suggested matches</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${myDeals.reduce((sum, deal) => sum + (deal.status === 'completed' ? deal.creator_payout : 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From completed deals</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="matches">AI Matches</TabsTrigger>
          <TabsTrigger value="my-deals">My Deals</TabsTrigger>
          <TabsTrigger value="brand-dashboard">Brand Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sponsorship Opportunities</CardTitle>
                  <CardDescription>Browse and apply to brand sponsorship campaigns</CardDescription>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search opportunities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="food">Food & Beverage</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {filteredOpportunities.map((opportunity) => (
                  <Card key={opportunity.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={opportunity.brand_profiles.logo_url} />
                            <AvatarFallback>
                              {opportunity.brand_profiles.company_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{opportunity.title}</h3>
                              {opportunity.brand_profiles.verification_status === 'verified' && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {opportunity.brand_profiles.company_name}
                            </p>
                            <p className="text-sm mb-3">{opportunity.description}</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className={getCampaignTypeColor(opportunity.campaign_type)}>
                                {opportunity.campaign_type.replace('_', ' ')}
                              </Badge>
                              {Array.isArray(opportunity.platforms) 
                                ? opportunity.platforms.map((platform) => (
                                    <Badge key={platform} variant="outline">
                                      {platform}
                                    </Badge>
                                  ))
                                : typeof opportunity.platforms === 'string'
                                ? JSON.parse(opportunity.platforms).map((platform: string) => (
                                    <Badge key={platform} variant="outline">
                                      {platform}
                                    </Badge>
                                  ))
                                : null
                              }
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            ${opportunity.budget.toLocaleString()}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">Budget</p>
                          {opportunity.deadline && (
                            <p className="text-sm text-muted-foreground mb-2">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Due: {new Date(opportunity.deadline).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mb-4">
                            {opportunity.applications_count} applications
                          </p>
                          <Button
                            onClick={() => {
                              setSelectedOpportunity(opportunity);
                              setShowApplicationModal(true);
                            }}
                            className="w-full"
                          >
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Brand Matches
              </CardTitle>
              <CardDescription>
                Personalized brand matches based on your content and audience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {brandMatches.map((match) => (
                  <Card key={match.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={match.brand_profiles.logo_url} />
                            <AvatarFallback>
                              {match.brand_profiles.company_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{match.brand_profiles.company_name}</h3>
                              <Badge className="bg-purple-100 text-purple-800">
                                {Math.round(match.match_score)}% Match
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {match.brand_profiles.industry}
                            </p>
                            {match.sponsorship_opportunities && (
                              <p className="text-sm mb-3">{match.sponsorship_opportunities.title}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {Array.isArray(match.match_reasons)
                                ? match.match_reasons.map((reason, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {reason}
                                    </Badge>
                                  ))
                                : typeof match.match_reasons === 'string'
                                ? JSON.parse(match.match_reasons).map((reason: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {reason}
                                    </Badge>
                                  ))
                                : null
                              }
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {match.sponsorship_opportunities && (
                            <div className="text-xl font-bold text-green-600 mb-2">
                              ${match.sponsorship_opportunities.budget.toLocaleString()}
                            </div>
                          )}
                          <div className="space-y-2">
                            <Button size="sm" className="w-full">
                              View Details
                            </Button>
                            <Button size="sm" variant="outline" className="w-full">
                              Contact Brand
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-deals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Sponsorship Deals</CardTitle>
              <CardDescription>Track your active and completed sponsorship agreements</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myDeals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={deal.brand_profiles.logo_url} />
                            <AvatarFallback>
                              {deal.brand_profiles.company_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{deal.brand_profiles.company_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{deal.sponsorship_opportunities.title}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">${deal.creator_payout.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            ${deal.deal_amount.toLocaleString()} total
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(deal.status)}>
                          {deal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(deal.deadline).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          View Deal
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand-dashboard" className="space-y-6">
          {brandProfile ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {brandProfile.company_name}
                      </CardTitle>
                      <CardDescription>Manage your brand presence and campaigns</CardDescription>
                    </div>
                    <Dialog open={showCreateOpportunity} onOpenChange={setShowCreateOpportunity}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          New Opportunity
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create Sponsorship Opportunity</DialogTitle>
                          <DialogDescription>
                            Post a new sponsorship opportunity for creators
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Campaign Title *</Label>
                            <Input
                              id="title"
                              value={newOpportunity.title}
                              onChange={(e) => setNewOpportunity({...newOpportunity, title: e.target.value})}
                              placeholder="Summer Product Launch Campaign"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                              id="description"
                              value={newOpportunity.description}
                              onChange={(e) => setNewOpportunity({...newOpportunity, description: e.target.value})}
                              placeholder="Detailed description of what you're looking for..."
                              rows={4}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="campaign_type">Campaign Type</Label>
                              <Select value={newOpportunity.campaign_type} onValueChange={(value) => setNewOpportunity({...newOpportunity, campaign_type: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sponsored_post">Sponsored Post</SelectItem>
                                  <SelectItem value="product_placement">Product Placement</SelectItem>
                                  <SelectItem value="brand_mention">Brand Mention</SelectItem>
                                  <SelectItem value="full_campaign">Full Campaign</SelectItem>
                                  <SelectItem value="affiliate">Affiliate</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="budget">Budget (USD) *</Label>
                              <Input
                                id="budget"
                                type="number"
                                value={newOpportunity.budget}
                                onChange={(e) => setNewOpportunity({...newOpportunity, budget: Number(e.target.value)})}
                                placeholder="5000"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline</Label>
                            <Input
                              id="deadline"
                              type="date"
                              value={newOpportunity.deadline}
                              onChange={(e) => setNewOpportunity({...newOpportunity, deadline: e.target.value})}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleCreateOpportunity} className="flex-1">
                              Create Opportunity
                            </Button>
                            <Button variant="outline" onClick={() => setShowCreateOpportunity(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Verification Status</p>
                      <Badge variant={brandProfile.verification_status === 'verified' ? 'default' : 'secondary'}>
                        {brandProfile.verification_status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Deals Completed</p>
                      <p className="text-2xl font-bold">{brandProfile.deals_completed}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-2xl font-bold">${brandProfile.total_spent.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Brand Profile</CardTitle>
                <CardDescription>
                  Set up your brand profile to start posting sponsorship opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={newBrand.company_name}
                    onChange={(e) => setNewBrand({...newBrand, company_name: e.target.value})}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select value={newBrand.industry} onValueChange={(value) => setNewBrand({...newBrand, industry: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="fashion">Fashion</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="food">Food & Beverage</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_description">Company Description</Label>
                  <Textarea
                    id="company_description"
                    value={newBrand.company_description}
                    onChange={(e) => setNewBrand({...newBrand, company_description: e.target.value})}
                    placeholder="Tell creators about your brand..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={newBrand.contact_person}
                      onChange={(e) => setNewBrand({...newBrand, contact_person: e.target.value})}
                      placeholder="Marketing Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={newBrand.contact_email}
                      onChange={(e) => setNewBrand({...newBrand, contact_email: e.target.value})}
                      placeholder="partnerships@company.com"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateBrandProfile} className="w-full">
                  Create Brand Profile
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue Analytics
              </CardTitle>
              <CardDescription>
                Track your sponsorship performance and earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Revenue Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed analytics and revenue tracking coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Application Modal */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply to Opportunity</DialogTitle>
            <DialogDescription>
              {selectedOpportunity?.title} by {selectedOpportunity?.brand_profiles.company_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pitch">Pitch Message *</Label>
              <Textarea
                id="pitch"
                value={application.pitch_message}
                onChange={(e) => setApplication({...application, pitch_message: e.target.value})}
                placeholder="Tell the brand why you're perfect for this campaign..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Proposed Rate (Optional)</Label>
              <Input
                id="rate"
                type="number"
                value={application.proposed_rate}
                onChange={(e) => setApplication({...application, proposed_rate: Number(e.target.value)})}
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label>Portfolio Links (Optional)</Label>
              {application.portfolio_links.map((link, index) => (
                <Input
                  key={index}
                  value={link}
                  onChange={(e) => {
                    const newLinks = [...application.portfolio_links];
                    newLinks[index] = e.target.value;
                    setApplication({...application, portfolio_links: newLinks});
                  }}
                  placeholder="https://your-content-link.com"
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApplication({
                  ...application,
                  portfolio_links: [...application.portfolio_links, ""]
                })}
              >
                Add Another Link
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyToOpportunity} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Submit Application
              </Button>
              <Button variant="outline" onClick={() => setShowApplicationModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}