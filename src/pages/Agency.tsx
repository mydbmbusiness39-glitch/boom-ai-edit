import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, 
  Users, 
  Plus, 
  Settings, 
  Mail, 
  Crown, 
  Shield, 
  Edit, 
  Eye, 
  Upload, 
  Zap,
  Calendar,
  Clock,
  BarChart3,
  TrendingUp,
  Target,
  CheckCircle,
  PlayCircle,
  Pause,
  MoreHorizontal,
  Palette,
  Filter,
  Search,
  Download
} from 'lucide-react';
import Layout from '@/components/Layout/Layout';

interface CreatorAccount {
  id: string;
  email: string;
  name: string;
  platform: string;
  followers: number;
  engagement_rate: number;
  last_active: string;
  status: 'active' | 'inactive' | 'pending';
  pending_jobs: number;
  completed_jobs: number;
  total_views: number;
}

interface BulkJob {
  id: string;
  creator_id: string;
  job_type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  scheduled_for?: string;
}

interface AgencyStats {
  total_creators: number;
  active_jobs: number;
  completed_this_month: number;
  total_views: number;
  avg_engagement: number;
}

const Agency: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creators, setCreators] = useState<CreatorAccount[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [stats, setStats] = useState<AgencyStats>({
    total_creators: 0,
    active_jobs: 0,
    completed_this_month: 0,
    total_views: 0,
    avg_engagement: 0
  });
  const [loading, setLoading] = useState(true);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [brandingDialogOpen, setBrandingDialogOpen] = useState(false);
  
  // Form states
  const [bulkAction, setBulkAction] = useState<'style-transfer' | 'one-tap-edit' | 'thumbnail' | 'batch-process'>('one-tap-edit');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // White-label branding
  const [agencyName, setAgencyName] = useState('Your Agency');
  const [agencyLogo, setAgencyLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');

  useEffect(() => {
    if (user) {
      loadAgencyData();
    }
  }, [user]);

  const loadAgencyData = async () => {
    try {
      setLoading(true);
      
      // Load team members as creators (mock data for now)
      const mockCreators: CreatorAccount[] = [
        {
          id: '1',
          email: 'creator1@example.com',
          name: 'Sarah Johnson',
          platform: 'TikTok',
          followers: 125000,
          engagement_rate: 8.5,
          last_active: new Date().toISOString(),
          status: 'active',
          pending_jobs: 3,
          completed_jobs: 47,
          total_views: 2500000
        },
        {
          id: '2',
          email: 'creator2@example.com',
          name: 'Mike Chen',
          platform: 'YouTube',
          followers: 89000,
          engagement_rate: 6.2,
          last_active: new Date(Date.now() - 86400000).toISOString(),
          status: 'active',
          pending_jobs: 1,
          completed_jobs: 32,
          total_views: 1800000
        },
        {
          id: '3',
          email: 'creator3@example.com',
          name: 'Emma Davis',
          platform: 'Instagram',
          followers: 67000,
          engagement_rate: 9.1,
          last_active: new Date(Date.now() - 172800000).toISOString(),
          status: 'active',
          pending_jobs: 5,
          completed_jobs: 28,
          total_views: 1200000
        },
        {
          id: '4',
          email: 'creator4@example.com',
          name: 'Alex Rivera',
          platform: 'TikTok',
          followers: 234000,
          engagement_rate: 7.8,
          last_active: new Date().toISOString(),
          status: 'active',
          pending_jobs: 2,
          completed_jobs: 56,
          total_views: 3100000
        },
        {
          id: '5',
          email: 'creator5@example.com',
          name: 'Jordan Kim',
          platform: 'YouTube',
          followers: 156000,
          engagement_rate: 5.9,
          last_active: new Date(Date.now() - 43200000).toISOString(),
          status: 'inactive',
          pending_jobs: 0,
          completed_jobs: 41,
          total_views: 2200000
        }
      ];

      setCreators(mockCreators);

      // Calculate stats
      const newStats: AgencyStats = {
        total_creators: mockCreators.length,
        active_jobs: mockCreators.reduce((sum, c) => sum + c.pending_jobs, 0),
        completed_this_month: mockCreators.reduce((sum, c) => sum + c.completed_jobs, 0),
        total_views: mockCreators.reduce((sum, c) => sum + c.total_views, 0),
        avg_engagement: mockCreators.reduce((sum, c) => sum + c.engagement_rate, 0) / mockCreators.length
      };
      setStats(newStats);

      // Mock bulk jobs
      setBulkJobs([
        {
          id: '1',
          creator_id: '1',
          job_type: 'one-tap-edit',
          status: 'processing',
          progress: 65,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          creator_id: '2',
          job_type: 'batch-process',
          status: 'queued',
          progress: 0,
          created_at: new Date().toISOString(),
          scheduled_for: new Date(Date.now() + 3600000).toISOString()
        }
      ]);

    } catch (error) {
      console.error('Error loading agency data:', error);
      toast({
        title: "Error",
        description: "Failed to load agency data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatorSelection = (creatorId: string, checked: boolean) => {
    if (checked) {
      setSelectedCreators(prev => [...prev, creatorId]);
    } else {
      setSelectedCreators(prev => prev.filter(id => id !== creatorId));
    }
  };

  const selectAllCreators = () => {
    const filteredCreatorIds = getFilteredCreators().map(c => c.id);
    setSelectedCreators(filteredCreatorIds);
  };

  const clearSelection = () => {
    setSelectedCreators([]);
  };

  const handleBulkAction = async () => {
    if (selectedCreators.length === 0) {
      toast({
        title: "No Creators Selected",
        description: "Please select at least one creator to perform bulk actions",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call bulk processing edge function
      const { data, error } = await supabase.functions.invoke('bulk-creator-processor', {
        body: {
          action: bulkAction,
          creator_ids: selectedCreators,
          scheduled_for: scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : null
        }
      });

      if (error) throw error;

      toast({
        title: "Bulk Action Started",
        description: `${bulkAction} initiated for ${selectedCreators.length} creators`,
      });

      setBulkDialogOpen(false);
      clearSelection();
      loadAgencyData(); // Refresh data

    } catch (error) {
      console.error('Error starting bulk action:', error);
      toast({
        title: "Error",
        description: "Failed to start bulk action",
        variant: "destructive"
      });
    }
  };

  const getFilteredCreators = () => {
    return creators.filter(creator => {
      const matchesSearch = creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          creator.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = filterPlatform === 'all' || creator.platform.toLowerCase() === filterPlatform.toLowerCase();
      const matchesStatus = filterStatus === 'all' || creator.status === filterStatus;
      
      return matchesSearch && matchesPlatform && matchesStatus;
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-600">Active</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      <div className="container max-w-7xl mx-auto p-6 space-y-8" style={{ 
        '--primary': primaryColor, 
        '--secondary': secondaryColor 
      } as React.CSSProperties}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {agencyLogo ? (
                <img src={agencyLogo} alt={agencyName} className="h-10 w-10 rounded-lg" />
              ) : (
                <Building className="h-10 w-10 text-primary" />
              )}
              <div>
                <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
                  {agencyName} Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage 50+ creator accounts with bulk operations
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setBrandingDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Palette className="h-4 w-4" />
              Branding
            </Button>
            
            <Button
              onClick={() => setBulkDialogOpen(true)}
              disabled={selectedCreators.length === 0}
              className="flex items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Zap className="h-4 w-4" />
              Bulk Actions ({selectedCreators.length})
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_creators}</div>
              <p className="text-xs text-muted-foreground">+3 new this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_jobs}</div>
              <p className="text-xs text-muted-foreground">Processing now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed_this_month}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.total_views)}</div>
              <p className="text-xs text-muted-foreground">All creators combined</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_engagement.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Across all platforms</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Creator Management
              <div className="flex items-center gap-2">
                {selectedCreators.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear ({selectedCreators.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={selectAllCreators}>
                      Select All Filtered
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Creators Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">
                        <Checkbox 
                          checked={selectedCreators.length === getFilteredCreators().length && getFilteredCreators().length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) selectAllCreators();
                            else clearSelection();
                          }}
                        />
                      </th>
                      <th className="text-left p-4 font-medium">Creator</th>
                      <th className="text-left p-4 font-medium">Platform</th>
                      <th className="text-left p-4 font-medium">Followers</th>
                      <th className="text-left p-4 font-medium">Engagement</th>
                      <th className="text-left p-4 font-medium">Jobs</th>
                      <th className="text-left p-4 font-medium">Views</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Last Active</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredCreators().map((creator) => (
                      <tr key={creator.id} className="border-t hover:bg-muted/25">
                        <td className="p-4">
                          <Checkbox 
                            checked={selectedCreators.includes(creator.id)}
                            onCheckedChange={(checked) => handleCreatorSelection(creator.id, !!checked)}
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{creator.name}</div>
                            <div className="text-sm text-muted-foreground">{creator.email}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{creator.platform}</Badge>
                        </td>
                        <td className="p-4 font-mono">
                          {formatNumber(creator.followers)}
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{creator.engagement_rate}%</span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{creator.pending_jobs} pending</div>
                            <div className="text-muted-foreground">{creator.completed_jobs} done</div>
                          </div>
                        </td>
                        <td className="p-4 font-mono">
                          {formatNumber(creator.total_views)}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(creator.status)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(creator.last_active).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Bulk Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bulkJobs.map((job) => {
                const creator = creators.find(c => c.id === job.creator_id);
                return (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{job.job_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {creator?.name} • {new Date(job.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {job.status === 'processing' && (
                        <div className="w-32">
                          <Progress value={job.progress} />
                          <div className="text-xs text-muted-foreground mt-1">
                            {job.progress}% complete
                          </div>
                        </div>
                      )}
                      
                      <Badge 
                        variant={job.status === 'completed' ? 'default' : 'secondary'}
                        className={job.status === 'processing' ? 'animate-pulse' : ''}
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              
              {bulkJobs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No active bulk operations
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Action Dialog */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bulk Actions</DialogTitle>
              <DialogDescription>
                Apply actions to {selectedCreators.length} selected creators
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulk-action">Action Type</Label>
                <Select value={bulkAction} onValueChange={(value: any) => setBulkAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-tap-edit">One-Tap Edit</SelectItem>
                    <SelectItem value="style-transfer">Style Transfer</SelectItem>
                    <SelectItem value="thumbnail">Thumbnail Generation</SelectItem>
                    <SelectItem value="batch-process">Batch Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label>Schedule (Optional)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkAction} style={{ backgroundColor: primaryColor }}>
                  Start Bulk Action
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Branding Dialog */}
        <Dialog open={brandingDialogOpen} onOpenChange={setBrandingDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>White-Label Branding</DialogTitle>
              <DialogDescription>
                Customize the appearance of your agency dashboard
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="agency-name">Agency Name</Label>
                <Input
                  id="agency-name"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Your Agency Name"
                />
              </div>

              <div>
                <Label htmlFor="agency-logo">Logo URL</Label>
                <Input
                  id="agency-logo"
                  value={agencyLogo}
                  onChange={(e) => setAgencyLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <Input
                    id="primary-color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <Input
                    id="secondary-color"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setBrandingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setBrandingDialogOpen(false);
                  toast({
                    title: "Branding Updated",
                    description: "Your white-label settings have been saved",
                  });
                }}>
                  Save Branding
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Agency;