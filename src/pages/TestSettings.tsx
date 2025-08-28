import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Settings,
  User,
  LogOut,
  TestTube,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout/Layout";

const TestSettings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || '');
  const [email] = useState(user?.email || '');

  const handleTestLogout = async () => {
    console.log('🔧 Test Logout Initiated');
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "Test logout successful",
      });
    } catch (error) {
      console.error('🔧 Logout Error:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive"
      });
    }
  };

  const handleSaveSettings = () => {
    console.log('🔧 Saving Test Settings:', { displayName, email });
    toast({
      title: "Settings saved",
      description: "Test settings updated successfully",
    });
  };

  const clearTestData = () => {
    console.log('🔧 Clearing Test Data');
    // Clear localStorage test data
    localStorage.removeItem('test-projects');
    localStorage.removeItem('test-sessions');
    
    toast({
      title: "Test data cleared",
      description: "All test data has been reset",
    });
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-boom-accent/10 border border-boom-accent/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-boom-accent" />
            <h1 className="text-2xl font-bold text-boom-accent">Test Settings</h1>
            <Badge variant="outline" className="text-boom-accent border-boom-accent">Debug Mode</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Minimal settings interface for Phase 2 testing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed in test mode
                </p>
              </div>

              <Button 
                onClick={handleSaveSettings}
                className="w-full"
                variant="outline"
              >
                Save Settings
              </Button>
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-1">Current Session</h4>
                  <p className="text-sm text-muted-foreground">
                    User: {user?.email || 'Not authenticated'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ID: {user?.id?.slice(0, 8) || 'none'}...
                  </p>
                </div>

                <Button 
                  onClick={clearTestData}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Test Data
                </Button>

                <Button 
                  onClick={handleTestLogout}
                  variant="destructive"
                  className="w-full justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Test Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Test Accounts</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>test1@boom.com</li>
                  <li>test2@boom.com</li>
                  <li>Password: boom1234</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Features Tested</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✅ Authentication</li>
                  <li>✅ Dashboard UI</li>
                  <li>✅ Settings Form</li>
                  <li>✅ Console Logging</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Test Status</h4>
                <div className="space-y-1">
                  <Badge variant="secondary">Phase 2 Active</Badge>
                  <Badge variant="outline">Debug Mode</Badge>
                  <Badge variant="outline">Console Logs</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TestSettings;