"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import styles from "@/app/nameradar.module.css";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean | null;
}

type PlanType = "monthly" | "yearly";

export default function CheckoutModal({
  isOpen,
  onClose,
  isAuthenticated,
}: CheckoutModalProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [isLoading, setIsLoading] = useState(false);

  // Get tier IDs from environment variables
  const MONTHLY_TIER = process.env.NEXT_PUBLIC_MONTHLY_TIER;
  const MONTHLY_SLUG = process.env.NEXT_PUBLIC_MONTHLY_SLUG;
  const YEARLY_TIER = process.env.NEXT_PUBLIC_YEARLY_TIER;
  const YEARLY_SLUG = process.env.NEXT_PUBLIC_YEARLY_SLUG;

  // Fallback to starter tier if monthly/yearly not configured
  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_STARTER_SLUG;

  const handleCheckout = async () => {
    if (isAuthenticated === false) {
      router.push("/sign-in");
      return;
    }

    setIsLoading(true);

    try {
      let productId: string;
      let slug: string;

      if (selectedPlan === "monthly") {
        productId = MONTHLY_TIER || STARTER_TIER || "";
        slug = MONTHLY_SLUG || STARTER_SLUG || "";
      } else {
        productId = YEARLY_TIER || STARTER_TIER || "";
        slug = YEARLY_SLUG || STARTER_SLUG || "";
      }

      if (!productId || !slug) {
        toast.error("Subscription configuration is missing. Please contact support.");
        return;
      }

      await authClient.checkout({
        products: [productId],
        slug: slug,
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.checkoutOverlay} ${isOpen ? styles.visible : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.checkoutModal}>
        <div className={styles.checkoutHeader}>
          <h2>Unlock NameRadar</h2>
          <p>Generate unlimited AI-powered brand names</p>
        </div>

        <div className={styles.pricingOptions}>
          {/* Monthly Plan */}
          <div
            className={`${styles.pricingCard} ${
              selectedPlan === "monthly" ? styles.selected : ""
            }`}
            onClick={() => setSelectedPlan("monthly")}
          >
            <div className={styles.pricingCardHeader}>
              <h3>Monthly</h3>
              <div className={styles.price}>
                $19<span>/mo</span>
              </div>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>Unlimited brand name generations</li>
              <li>Domain availability checks</li>
              <li>Trademark screening</li>
              <li>Cancel anytime</li>
            </ul>
          </div>

          {/* Yearly Plan */}
          <div
            className={`${styles.pricingCard} ${styles.popular} ${
              selectedPlan === "yearly" ? styles.selected : ""
            }`}
            onClick={() => setSelectedPlan("yearly")}
          >
            <span className={styles.popularBadge}>Save 33%</span>
            <div className={styles.pricingCardHeader}>
              <h3>Yearly</h3>
              <div className={styles.price}>
                $149<span>/yr</span>
              </div>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>Everything in Monthly</li>
              <li>Priority support</li>
              <li>Early access to new features</li>
              <li>2 months free</li>
            </ul>
          </div>
        </div>

        <div className={styles.checkoutActions}>
          <button
            className={styles.btnCheckout}
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : isAuthenticated === false
              ? "Sign In to Subscribe"
              : `Subscribe ${selectedPlan === "monthly" ? "Monthly" : "Yearly"}`}
          </button>
          <button className={styles.btnCancel} onClick={onClose}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
