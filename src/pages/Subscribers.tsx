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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { 
  Users, 
  Mail, 
  MessageSquare, 
  TrendingUp, 
  Star, 
  Heart, 
  Eye, 
  Target,
  Plus,
  Send,
  Filter,
  Download,
  Upload
} from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  source: string;
  status: string;
  fan_segment: string;
  engagement_score: number;
  total_opens: number;
  total_clicks: number;
  purchase_value: number;
  created_at: string;
  last_engagement?: string;
}

interface EmailList {
  id: string;
  name: string;
  description?: string;
  subscriber_count: number;
  created_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  total_opens: number;
  total_clicks: number;
  sent_at?: string;
}

export default function Subscribers() {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Subscriber form state
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [newSubscriber, setNewSubscriber] = useState({
    email: "",
    name: "",
    phone: "",
    source: "manual"
  });

  // Email list form state
  const [showCreateList, setShowCreateList] = useState(false);
  const [newList, setNewList] = useState({
    name: "",
    description: ""
  });

  // Campaign form state
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    content: "",
    target_segment: "all"
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subscribersRes, listsRes, campaignsRes] = await Promise.all([
        supabase.from('subscribers').select('*').order('created_at', { ascending: false }),
        supabase.from('email_lists').select('*').order('created_at', { ascending: false }),
        supabase.from('email_campaigns').select('*').order('created_at', { ascending: false })
      ]);

      if (subscribersRes.data) setSubscribers(subscribersRes.data);
      if (listsRes.data) setEmailLists(listsRes.data);
      if (campaignsRes.data) setCampaigns(campaignsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load subscriber data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscriber = async () => {
    if (!newSubscriber.email) {
      toast.error('Email is required');
      return;
    }

    try {
      const { error } = await supabase.from('subscribers').insert([{
        ...newSubscriber,
        user_id: user?.id
      }]);

      if (error) throw error;

      toast.success('Subscriber added successfully');
      setNewSubscriber({ email: "", name: "", phone: "", source: "manual" });
      setShowAddSubscriber(false);
      fetchData();
    } catch (error) {
      console.error('Error adding subscriber:', error);
      toast.error('Failed to add subscriber');
    }
  };

  const handleCreateList = async () => {
    if (!newList.name) {
      toast.error('List name is required');
      return;
    }

    try {
      const { error } = await supabase.from('email_lists').insert([{
        ...newList,
        user_id: user?.id
      }]);

      if (error) throw error;

      toast.success('Email list created successfully');
      setNewList({ name: "", description: "" });
      setShowCreateList(false);
      fetchData();
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create email list');
    }
  };

  const handleSendCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.content) {
      toast.error('All campaign fields are required');
      return;
    }

    try {
      // Create campaign
      const { data: campaign, error } = await supabase.from('email_campaigns').insert([{
        ...newCampaign,
        user_id: user?.id,
        status: 'sending'
      }]).select().single();

      if (error) throw error;

      // Call edge function to send emails
      const { error: sendError } = await supabase.functions.invoke('send-campaign-emails', {
        body: { campaignId: campaign.id }
      });

      if (sendError) throw sendError;

      toast.success('Campaign sent successfully');
      setNewCampaign({ name: "", subject: "", content: "", target_segment: "all" });
      setShowCreateCampaign(false);
      fetchData();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign');
    }
  };

  const filteredSubscribers = subscribers.filter(subscriber => {
    const matchesSegment = selectedSegment === "all" || subscriber.fan_segment === selectedSegment;
    const matchesSearch = subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (subscriber.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSegment && matchesSearch;
  });

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'superfan': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'engaged': return 'bg-gradient-to-r from-green-500 to-blue-500 text-white';
      case 'casual': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'at_risk': return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      default: return 'bg-secondary';
    }
  };

  const segmentStats = subscribers.reduce((acc, subscriber) => {
    acc[subscriber.fan_segment] = (acc[subscriber.fan_segment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
            Fan Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage subscribers, email lists, and personalized campaigns
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscribers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active fan base
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Superfans</CardTitle>
            <Star className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segmentStats.superfan || 0}</div>
            <p className="text-xs text-muted-foreground">
              High-value supporters
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Lists</CardTitle>
            <Mail className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailLists.length}</div>
            <p className="text-xs text-muted-foreground">
              Segmented audiences
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns Sent</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'sent').length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fan Segments Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Fan Segmentation
          </CardTitle>
          <CardDescription>
            Auto-segmented based on engagement and behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['superfan', 'engaged', 'casual', 'at_risk'].map(segment => (
              <div key={segment} className="text-center p-4 rounded-lg border">
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2 ${getSegmentColor(segment)}`}>
                  {segment.charAt(0).toUpperCase() + segment.slice(1).replace('_', ' ')}
                </div>
                <div className="text-2xl font-bold">{segmentStats[segment] || 0}</div>
                <div className="text-sm text-muted-foreground">subscribers</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="subscribers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="lists">Email Lists</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="messages">Direct Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscriber Management</CardTitle>
                  <CardDescription>Manage your subscriber base and fan segments</CardDescription>
                </div>
                <Dialog open={showAddSubscriber} onOpenChange={setShowAddSubscriber}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subscriber
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Subscriber</DialogTitle>
                      <DialogDescription>
                        Add a new subscriber to your fan base
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newSubscriber.email}
                          onChange={(e) => setNewSubscriber({...newSubscriber, email: e.target.value})}
                          placeholder="subscriber@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={newSubscriber.name}
                          onChange={(e) => setNewSubscriber({...newSubscriber, name: e.target.value})}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={newSubscriber.phone}
                          onChange={(e) => setNewSubscriber({...newSubscriber, phone: e.target.value})}
                          placeholder="+1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="source">Source</Label>
                        <Select value={newSubscriber.source} onValueChange={(value) => setNewSubscriber({...newSubscriber, source: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddSubscriber} className="flex-1">
                          Add Subscriber
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddSubscriber(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search subscribers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    <SelectItem value="superfan">Superfans</SelectItem>
                    <SelectItem value="engaged">Engaged</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {subscriber.name ? subscriber.name.charAt(0).toUpperCase() : subscriber.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{subscriber.name || 'Anonymous'}</div>
                            <div className="text-sm text-muted-foreground">{subscriber.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSegmentColor(subscriber.fan_segment)}>
                          {subscriber.fan_segment.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Progress value={subscriber.engagement_score} className="flex-1" />
                            <span className="text-sm text-muted-foreground">{subscriber.engagement_score}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subscriber.total_opens} opens · {subscriber.total_clicks} clicks
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{subscriber.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(subscriber.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Lists</CardTitle>
                  <CardDescription>Organize subscribers into targeted lists</CardDescription>
                </div>
                <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create List
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Email List</DialogTitle>
                      <DialogDescription>
                        Create a new email list to segment your audience
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="listName">List Name *</Label>
                        <Input
                          id="listName"
                          value={newList.name}
                          onChange={(e) => setNewList({...newList, name: e.target.value})}
                          placeholder="Superfan VIP List"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="listDescription">Description</Label>
                        <Textarea
                          id="listDescription"
                          value={newList.description}
                          onChange={(e) => setNewList({...newList, description: e.target.value})}
                          placeholder="Description of this email list..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleCreateList} className="flex-1">
                          Create List
                        </Button>
                        <Button variant="outline" onClick={() => setShowCreateList(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emailLists.map((list) => (
                  <Card key={list.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      <CardDescription>{list.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">{list.subscriber_count}</div>
                        <div className="text-sm text-muted-foreground">subscribers</div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          Manage
                        </Button>
                        <Button size="sm" className="flex-1">
                          Send Campaign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Campaigns</CardTitle>
                  <CardDescription>Send personalized updates and video drops</CardDescription>
                </div>
                <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Email Campaign</DialogTitle>
                      <DialogDescription>
                        Send targeted emails to your subscribers
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="campaignName">Campaign Name *</Label>
                        <Input
                          id="campaignName"
                          value={newCampaign.name}
                          onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                          placeholder="New Video Drop Alert"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="campaignSubject">Email Subject *</Label>
                        <Input
                          id="campaignSubject"
                          value={newCampaign.subject}
                          onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})}
                          placeholder="🔥 New Video Just Dropped!"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetSegment">Target Audience</Label>
                        <Select value={newCampaign.target_segment} onValueChange={(value) => setNewCampaign({...newCampaign, target_segment: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subscribers</SelectItem>
                            <SelectItem value="superfans">Superfans Only</SelectItem>
                            <SelectItem value="engaged">Engaged Fans</SelectItem>
                            <SelectItem value="casual">Casual Viewers</SelectItem>
                            <SelectItem value="at_risk">At Risk (Win-back)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="campaignContent">Email Content *</Label>
                        <Textarea
                          id="campaignContent"
                          value={newCampaign.content}
                          onChange={(e) => setNewCampaign({...newCampaign, content: e.target.value})}
                          placeholder="Hey {name},

I just dropped a new video that I think you'll love...

Watch now: [VIDEO_LINK]

Let me know what you think!
- Your Creator"
                          rows={8}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSendCampaign} className="flex-1">
                          <Send className="h-4 w-4 mr-2" />
                          Send Campaign
                        </Button>
                        <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">{campaign.subject}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.total_recipients}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex gap-4 text-sm">
                            <span><Eye className="h-3 w-3 inline mr-1" />{campaign.total_opens}</span>
                            <span><MessageSquare className="h-3 w-3 inline mr-1" />{campaign.total_clicks}</span>
                          </div>
                          {campaign.total_recipients > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {Math.round((campaign.total_opens / campaign.total_recipients) * 100)}% open rate
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Direct Messages</CardTitle>
              <CardDescription>Send personalized messages to individual subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Direct Messaging</h3>
                <p className="text-muted-foreground mb-4">
                  Send personalized messages to individual fans and subscribers
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}