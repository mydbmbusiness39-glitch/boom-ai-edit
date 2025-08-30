import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Check, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthProvider";
import Layout from "@/components/Layout/Layout";

const Billing = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState("free");

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "3 projects per month",
        "Basic AI editing",
        "720p exports",
        "Community support"
      ],
      popular: false
    },
    {
      id: "pro",
      name: "Pro",
      price: "$19",
      period: "month",
      features: [
        "Unlimited projects",
        "Advanced AI tools",
        "4K exports",
        "Priority support",
        "Team collaboration",
        "Custom branding"
      ],
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$99",
      period: "month",
      features: [
        "Everything in Pro",
        "White-label solution",
        "API access",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee"
      ],
      popular: false
    }
  ];

  const handlePlanSelect = (planId: string) => {
    if (planId === currentPlan) return;
    
    if (planId === "free") {
      toast({
        title: "Plan changed",
        description: "Switched to Free plan."
      });
      setCurrentPlan("free");
    } else {
      toast({
        title: "Upgrade coming soon",
        description: "Payment integration will be available soon."
      });
    }
  };

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Plans & Billing</h1>
            <p className="text-muted-foreground">Choose the plan that fits your needs</p>
          </div>
        </div>

        {/* Current Plan Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium capitalize">{currentPlan} Plan</p>
                <p className="text-muted-foreground">
                  {currentPlan === "free" ? "No billing required" : `Billed monthly • Next charge on ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}`}
                </p>
              </div>
              <Badge variant={currentPlan === "free" ? "secondary" : "default"}>
                {currentPlan === "free" ? "Free" : "Active"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.period}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handlePlanSelect(plan.id)}
                    variant={plan.id === currentPlan ? "secondary" : (plan.popular ? "default" : "outline")}
                    className="w-full"
                    disabled={plan.id === currentPlan}
                  >
                    {plan.id === currentPlan ? "Current Plan" : `Select ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        {currentPlan !== "free" && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-5 bg-primary rounded"></div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage & Invoices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>This Month's Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Projects created</span>
                <span className="font-medium">2/∞</span>
              </div>
              <div className="flex justify-between">
                <span>Export minutes</span>
                <span className="font-medium">45/∞</span>
              </div>
              <div className="flex justify-between">
                <span>Storage used</span>
                <span className="font-medium">1.2GB/100GB</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No invoices yet</p>
                <p className="text-sm">Invoices will appear here when you upgrade</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Billing;