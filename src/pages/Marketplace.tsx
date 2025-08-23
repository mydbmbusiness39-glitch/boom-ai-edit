import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Store, Search, Star, Download, DollarSign, Plus, Eye, Filter, TrendingUp, Crown, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface MarketplaceItem {
  id: string;
  creator_id: string;
  type: string;
  name: string;
  description: string;
  preview_url?: string;
  thumbnail_url?: string;
  price: number;
  is_free: boolean;
  tags: any; // Changed from string[] to any to handle JSON data
  content: any;
  downloads_count: number;
  rating: number;
  reviews_count: number;
  is_featured: boolean;
  created_at: string;
}

interface BrandTemplate {
  id: string;
  name: string;
  logo_url?: string;
  brand_colors: any;
  fonts: any;
  price: number;
  sales_count: number;
  is_public: boolean;
}

const Marketplace = () => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>([]);
  const [brandTemplates, setBrandTemplates] = useState<BrandTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [newItem, setNewItem] = useState({
    type: "brand_template",
    name: "",
    description: "",
    price: 0,
    is_free: true,
    tags: "",
    preview_url: "",
    content: {}
  });

  const { toast } = useToast();

  useEffect(() => {
    loadMarketplaceItems();
    loadBrandTemplates();
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [items, searchQuery, selectedType, sortBy]);

  const loadMarketplaceItems = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading marketplace items:', error);
    }
  };

  const loadBrandTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('brand-manager', {
        body: { action: 'get_templates' }
      });

      if (error) throw error;
      setBrandTemplates(data.public_templates || []);
    } catch (error) {
      console.error('Error loading brand templates:', error);
    }
  };

  const filterAndSortItems = () => {
    let filtered = [...items];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(item.tags) ? item.tags : []).some((tag: string) => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Sort items
    switch (sortBy) {
      case "featured":
        filtered.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
        break;
      case "popular":
        filtered.sort((a, b) => b.downloads_count - a.downloads_count);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "price_low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    setFilteredItems(filtered);
  };

  const handleCreateItem = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to create marketplace items",
          variant: "destructive"
        });
        return;
      }

      const itemData = {
        ...newItem,
        creator_id: userData.user.id,
        tags: newItem.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        content: {
          brand_colors: { primary: "#3B82F6", secondary: "#10B981", accent: "#F59E0B" },
          fonts: { heading: "Inter", body: "Inter", caption: "Inter" },
          ...newItem.content
        }
      };

      const { data, error } = await supabase
        .from('marketplace_items')
        .insert(itemData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Item Created",
        description: "Your marketplace item has been submitted for review",
      });

      setIsCreateDialogOpen(false);
      setNewItem({
        type: "brand_template",
        name: "",
        description: "",
        price: 0,
        is_free: true,
        tags: "",
        preview_url: "",
        content: {}
      });

      loadMarketplaceItems();

    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create marketplace item",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (itemId: string, price: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to purchase items",
          variant: "destructive"
        });
        return;
      }

      // Mock purchase - in real app would integrate with payment processor
      const { data, error } = await supabase
        .from('purchases')
        .insert({
          buyer_id: userData.user.id,
          item_id: itemId,
          price_paid: price
        });

      if (error) throw error;

      toast({
        title: "Purchase Successful",
        description: "Item has been added to your library",
      });

      // Update download count
      const item = items.find(i => i.id === itemId);
      if (item) {
        await supabase
          .from('marketplace_items')
          .update({ downloads_count: item.downloads_count + 1 })
          .eq('id', itemId);
      }

      loadMarketplaceItems();

    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase",
        variant: "destructive"
      });
    }
  };

  const itemTypes = [
    { value: "all", label: "All Items" },
    { value: "brand_template", label: "Brand Templates" },
    { value: "overlay_pack", label: "Overlay Packs" },
    { value: "caption_pack", label: "Caption Packs" },
    { value: "intro_pack", label: "Intro Packs" },
    { value: "outro_pack", label: "Outro Packs" }
  ];

  const sortOptions = [
    { value: "featured", label: "Featured" },
    { value: "popular", label: "Most Popular" },
    { value: "newest", label: "Newest" },
    { value: "rating", label: "Highest Rated" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" }
  ];

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Store className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              Creator Marketplace
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover and sell premium templates, overlays, and creative assets
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates, overlays, captions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-neon-purple to-neon-green text-background">
                  <Plus className="h-4 w-4 mr-2" />
                  Sell Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Marketplace Item</DialogTitle>
                  <DialogDescription>
                    Share your creative assets with the community
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Type</Label>
                      <Select
                        value={newItem.type}
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brand_template">Brand Template</SelectItem>
                          <SelectItem value="overlay_pack">Overlay Pack</SelectItem>
                          <SelectItem value="caption_pack">Caption Pack</SelectItem>
                          <SelectItem value="intro_pack">Intro Pack</SelectItem>
                          <SelectItem value="outro_pack">Outro Pack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="My Awesome Template"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe your item and what makes it special..."
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tags (comma separated)</Label>
                      <Input
                        placeholder="modern, corporate, minimalist"
                        value={newItem.tags}
                        onChange={(e) => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preview URL</Label>
                      <Input
                        placeholder="https://..."
                        value={newItem.preview_url}
                        onChange={(e) => setNewItem(prev => ({ ...prev, preview_url: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newItem.is_free}
                        onCheckedChange={(checked) => setNewItem(prev => ({ 
                          ...prev, 
                          is_free: checked, 
                          price: checked ? 0 : prev.price 
                        }))}
                      />
                      <Label>Free Item</Label>
                    </div>
                    
                    {!newItem.is_free && (
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItem.price}
                          onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateItem}
                      disabled={!newItem.name || isLoading}
                      className="bg-gradient-to-r from-neon-purple to-neon-green text-background"
                    >
                      {isLoading ? 'Creating...' : 'Create Item'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            <TabsTrigger value="brand-templates">Brand Templates</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 space-y-4">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                      {item.thumbnail_url ? (
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Palette className="h-12 w-12 text-muted-foreground" />
                      )}
                      {item.is_featured && (
                        <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">
                          <Crown className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {item.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Download className="h-3 w-3" />
                          <span>{item.downloads_count}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">
                            {item.is_free ? 'Free' : `$${item.price.toFixed(2)}`}
                          </span>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handlePurchase(item.id, item.price)}
                            className="bg-gradient-to-r from-neon-purple to-neon-green text-background"
                          >
                            {item.is_free ? 'Get' : 'Buy'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="brand-templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandTemplates.map((template) => (
                <Card key={template.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 space-y-4">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="grid grid-cols-2 gap-2 p-4">
                        {Object.values(template.brand_colors).map((color: any, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {template.logo_url && (
                        <Badge className="absolute top-2 right-2">Logo</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">{template.name}</h3>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{template.sales_count} uses</span>
                        <span className="font-medium">
                          {template.price > 0 ? `$${template.price.toFixed(2)}` : 'Free'}
                        </span>
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.filter(item => item.is_featured).map((item) => (
                <Card key={item.id} className="group hover:shadow-lg transition-shadow border-2 border-yellow-200">
                  <CardContent className="p-4 space-y-4">
                    <div className="aspect-video bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <Crown className="h-12 w-12 text-yellow-600" />
                      <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">
                        Featured
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {item.is_free ? 'Free' : `$${item.price.toFixed(2)}`}
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => handlePurchase(item.id, item.price)}
                          className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
                        >
                          {item.is_free ? 'Get Featured' : 'Buy Now'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Marketplace;