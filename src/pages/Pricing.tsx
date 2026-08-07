import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Zap, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";

/**
 * Boom AI Edit — Pricing page.
 * Tiers: Free (taste) / Pro $19.99 (core) / Business $49 (teams + white-label).
 * Billing toggler: monthly / yearly (2 months free).
 * Store launch (Phase 2) will swap checkout links for RevenueCat / IAP / Play Billing.
 */
const Pricing = () => {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);

  const tiers = [
    {
      name: "Free",
      price: 0,
      yearlyPrice: 0,
      tagline: "Test the waters",
      icon: Zap,
      cta: "Start Free",
      features: [
        "1 active project",
        "5 renders / month",
        "720p export with watermark",
        "Basic editor + timeline",
        "Community support",
      ],
      highlight: false,
    },
    {
      name: "Pro",
      price: 19.99,
      yearlyPrice: 199.99,
      tagline: "For serious creators",
      icon: Sparkles,
      cta: "Get Pro",
      features: [
        "Unlimited renders",
        "No watermark · 1080p export",
        "AI captions (auto burn-in)",
        "Poster templates — one-click",
        "AI hook generator",
        "All AI tools: dubbing, music, thumbnails",
        "Priority render queue",
      ],
      highlight: true,
    },
    {
      name: "Business",
      price: 49,
      yearlyPrice: 499.99,
      tagline: "For teams & agencies",
      icon: Building2,
      cta: "Get Business",
      features: [
        "Everything in Pro",
        "3 team seats (more available)",
        "White-label export (no Boom branding)",
        "Brand kit + custom templates",
        "API access",
        "Dedicated support",
      ],
      highlight: false,
    },
  ];

  const priceFor = (tier: (typeof tiers)[number]) =>
    yearly && tier.price > 0 ? `$${tier.yearlyPrice}` : tier.price === 0 ? "$0" : `$${tier.price}`;

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="text-xs tracking-wide uppercase">
            Pricing
          </Badge>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
            Edit Faster. Ship More.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-assisted video editing for creators who don't have time to edit.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 pt-2">
            <span className={cn("text-sm", !yearly && "font-semibold")}>Monthly</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                yearly ? "bg-neon-purple" : "bg-muted"
              )}
              aria-label="Toggle yearly billing"
            >
              <span
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                  yearly ? "translate-x-6" : "translate-x-0.5"
                )}
              />
            </button>
            <span className={cn("text-sm", yearly && "font-semibold")}>
              Yearly <span className="text-neon-green text-xs font-semibold">2 months free</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "relative flex flex-col",
                tier.highlight &&
                  "border-neon-purple shadow-lg shadow-neon-purple/20 md:-mt-4 md:mb-[-1rem]"
              )}
            >
              {tier.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-purple text-white">
                  MOST POPULAR
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <tier.icon className="h-5 w-5 text-neon-purple" />
                  <CardTitle>{tier.name}</CardTitle>
                </div>
                <CardDescription>{tier.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{priceFor(tier)}</span>
                  {tier.price > 0 && <span className="text-muted-foreground text-sm">/{yearly ? "yr" : "mo"}</span>}
                </div>
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-neon-green mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={cn("w-full", tier.highlight && "bg-neon-purple hover:bg-neon-purple/90")}
                  onClick={() => navigate("/auth")}
                >
                  {tier.cta} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground pt-4">
          All plans include a 7-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </Layout>
  );
};

export default Pricing;
