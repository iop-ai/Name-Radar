"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
};

type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: "CANCELED" | "EXPIRED" | "GENERAL";
};

interface PricingTableProps {
  subscriptionDetails: SubscriptionDetailsResult;
}

export default function PricingTable({
  subscriptionDetails,
}: PricingTableProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        setIsAuthenticated(!!session.data?.user);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleCheckout = async (productId: string, slug: string) => {
    if (isAuthenticated === false) {
      router.push("/sign-in");
      return;
    }

    try {
      await authClient.checkout({
        products: [productId],
        slug: slug,
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Oops, something went wrong");
    }
  };

  const handleManageSubscription = async () => {
    try {
      await authClient.customer.portal();
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open subscription management");
    }
  };

  // Get tier IDs from environment variables
  const MONTHLY_TIER = process.env.NEXT_PUBLIC_MONTHLY_TIER;
  const MONTHLY_SLUG = process.env.NEXT_PUBLIC_MONTHLY_SLUG;
  const YEARLY_TIER = process.env.NEXT_PUBLIC_YEARLY_TIER;
  const YEARLY_SLUG = process.env.NEXT_PUBLIC_YEARLY_SLUG;
  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_STARTER_SLUG;

  const isCurrentPlan = (tierProductId: string | undefined) => {
    if (!tierProductId) return false;
    return (
      subscriptionDetails.hasSubscription &&
      subscriptionDetails.subscription?.productId === tierProductId &&
      subscriptionDetails.subscription?.status === "active"
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const hasAnyActiveSubscription =
    subscriptionDetails.hasSubscription &&
    subscriptionDetails.subscription?.status === "active";

  return (
    <section className="flex flex-col items-center justify-center px-4 mb-24 w-full">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-medium tracking-tight mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground">
          Unlock unlimited AI-powered brand name generation
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Monthly Tier */}
        <Card className="relative h-fit">
          {isCurrentPlan(MONTHLY_TIER || STARTER_TIER) &&
            subscriptionDetails.subscription?.recurringInterval === "month" && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  Current Plan
                </Badge>
              </div>
            )}
          <CardHeader>
            <CardTitle className="text-2xl">Monthly</CardTitle>
            <CardDescription>Perfect for trying out NameRadar</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$19</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Unlimited brand name generations</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Domain availability checks</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Trademark screening</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </CardContent>
          <CardFooter>
            {hasAnyActiveSubscription ? (
              <div className="w-full space-y-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleManageSubscription}
                >
                  Manage Subscription
                </Button>
                {subscriptionDetails.subscription && (
                  <p className="text-sm text-muted-foreground text-center">
                    {subscriptionDetails.subscription.cancelAtPeriodEnd
                      ? `Expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                      : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                  </p>
                )}
              </div>
            ) : (
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  handleCheckout(
                    MONTHLY_TIER || STARTER_TIER || "",
                    MONTHLY_SLUG || STARTER_SLUG || ""
                  )
                }
              >
                {isAuthenticated === false
                  ? "Sign In to Subscribe"
                  : "Get Started"}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Yearly Tier */}
        <Card className="relative h-fit border-[#FF6B00]">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]">
              {isCurrentPlan(YEARLY_TIER) ? "Current Plan" : "Save 33%"}
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Yearly</CardTitle>
            <CardDescription>Best value for serious founders</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$149</span>
              <span className="text-muted-foreground">/year</span>
              <p className="text-sm text-muted-foreground mt-1">
                That&apos;s only $12.42/month
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Everything in Monthly</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Priority support</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Early access to new features</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>2 months free</span>
            </div>
          </CardContent>
          <CardFooter>
            {hasAnyActiveSubscription ? (
              <div className="w-full space-y-2">
                <Button
                  className="w-full bg-[#FF6B00] hover:bg-[#e66000]"
                  onClick={handleManageSubscription}
                >
                  Manage Subscription
                </Button>
                {subscriptionDetails.subscription && (
                  <p className="text-sm text-muted-foreground text-center">
                    {subscriptionDetails.subscription.cancelAtPeriodEnd
                      ? `Expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                      : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                  </p>
                )}
              </div>
            ) : (
              <Button
                className="w-full bg-[#FF6B00] hover:bg-[#e66000]"
                onClick={() =>
                  handleCheckout(
                    YEARLY_TIER || STARTER_TIER || "",
                    YEARLY_SLUG || STARTER_SLUG || ""
                  )
                }
              >
                {isAuthenticated === false
                  ? "Sign In to Subscribe"
                  : "Get Started"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          Need a custom plan for your team?{" "}
          <a
            href="mailto:hello@nameradar.ai"
            className="text-[#FF6B00] cursor-pointer hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>
    </section>
  );
}
