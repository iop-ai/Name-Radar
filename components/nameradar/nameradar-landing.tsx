"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import styles from "@/app/nameradar.module.css";
import CheckoutModal from "./checkout-modal";

// Dynamically import Three.js component to avoid SSR issues
const ThreeBackground = dynamic(() => import("./three-background"), {
  ssr: false,
});

interface BrandName {
  name: string;
  explanation: string;
}

interface SubscriptionDetails {
  hasSubscription: boolean;
  subscription?: {
    status: string;
  };
}

interface NameRadarLandingProps {
  subscriptionDetails: SubscriptionDetails;
}

export default function NameRadarLanding({
  subscriptionDetails,
}: NameRadarLandingProps) {
  const [brandInput, setBrandInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [brandNames, setBrandNames] = useState<BrandName[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeSteps, setActiveSteps] = useState<number[]>([0]);
  const [loadingText, setLoadingText] = useState("Generate");
  const resultsBoardRef = useRef<HTMLDivElement>(null);

  const hasActiveSubscription =
    subscriptionDetails.hasSubscription &&
    subscriptionDetails.subscription?.status === "active";

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

  // Loading animation
  useEffect(() => {
    if (!isGenerating) return;

    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      setLoadingText("Generating" + ".".repeat(dots));
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    const userInput = brandInput.trim();

    if (!userInput) {
      toast.error("Please describe your brand to generate names.");
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowCheckout(true);
      return;
    }

    // Check if user has subscription
    if (!hasActiveSubscription) {
      setShowCheckout(true);
      return;
    }

    // User is authenticated and subscribed - proceed with generation
    setIsGenerating(true);
    setBrandNames([]);
    setShowResults(false);

    // Animate steps
    setActiveSteps([0]);
    setTimeout(() => setActiveSteps([0, 1]), 1500);
    setTimeout(() => setActiveSteps([0, 1, 2]), 3000);

    try {
      const response = await fetch("/api/generate-brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please sign in to continue.");
          setShowCheckout(true);
        } else if (response.status === 403) {
          toast.error("Please subscribe to generate brand names.");
          setShowCheckout(true);
        } else {
          toast.error(data.error || "Failed to generate brand names.");
        }
        return;
      }

      setBrandNames(data.brandNames);
      setShowResults(true);

      // Scroll to results after a short delay
      setTimeout(() => {
        resultsBoardRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
      setLoadingText("Generate");
    }
  };

  // Generate random availability for demo purposes
  const getRandomAvailability = () => ({
    com: Math.random() > 0.4,
    ai: Math.random() > 0.5,
    tm: Math.random() > 0.6,
  });

  return (
    <div className="relative min-h-screen">
      {/* Three.js Background */}
      <ThreeBackground className={styles.webgl} />

      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>NameRadar.ai</div>
        <div className={styles.navLinks}>
          <Link href="/" className={styles.active}>
            Generate
          </Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          {isAuthenticated ? (
            <Link href="/dashboard">
              <button className={styles.btnLogin}>Dashboard</button>
            </Link>
          ) : (
            <Link href="/sign-in">
              <button className={styles.btnLogin}>Login</button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitleHidden}>Find Your Perfect Brand</h1>

        <p className={styles.heroSubtitle}>
          AI-powered naming for the next generation of startups.
        </p>

        <div className={`${styles.glassPanel} ${styles.inputContainer}`}>
          <textarea
            value={brandInput}
            onChange={(e) => setBrandInput(e.target.value)}
            maxLength={1000}
            placeholder="Describe your brand (e.g. A high-performance running shoe brand with eco-friendly materials)"
          />
          <div className={styles.inputFooter}>
            <span className={styles.charCounter}>{brandInput.length}/1000</span>
            <button
              className={styles.btnPrimary}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {loadingText}
            </button>
          </div>
        </div>

        <div className={styles.stepsContainer}>
          <div
            className={`${styles.step} ${
              activeSteps.includes(0) ? styles.active : ""
            }`}
          >
            <div className={styles.stepIcon}>1</div>
            <span>Ideation</span>
          </div>
          <div className={styles.stepLine}></div>
          <div
            className={`${styles.step} ${
              activeSteps.includes(1) ? styles.active : ""
            }`}
          >
            <div className={styles.stepIcon}>2</div>
            <span>Domain</span>
          </div>
          <div className={styles.stepLine}></div>
          <div
            className={`${styles.step} ${
              activeSteps.includes(2) ? styles.active : ""
            }`}
          >
            <div className={styles.stepIcon}>3</div>
            <span>Trademark</span>
          </div>
        </div>
      </section>

      {/* Results Board */}
      <section
        ref={resultsBoardRef}
        className={`${styles.resultsBoard} ${showResults ? styles.visible : ""}`}
      >
        <div className={styles.resultsHeader}>
          <h2>Clearance Board</h2>
          <span className={styles.statusBadge}>Live</span>
        </div>
        <div className={styles.resultsGrid}>
          {brandNames.map((brand, index) => {
            const availability = getRandomAvailability();
            return (
              <div
                key={index}
                className={`${styles.resultCard} ${
                  showResults ? styles.visible : ""
                }`}
                style={{
                  transitionDelay: `${index * 0.1}s`,
                }}
              >
                <div className={styles.cardHeader}>
                  <h3>{brand.name}</h3>
                  <div className={styles.cardActions}>
                    <button className={styles.btnIcon} title={brand.explanation}>
                      Info
                    </button>
                    {(availability.com || availability.ai) && (
                      <button className={styles.btnIcon}>Buy</button>
                    )}
                  </div>
                </div>
                <div className={styles.statusRow}>
                  <div
                    className={`${styles.statusItem} ${
                      availability.com ? styles.available : styles.taken
                    }`}
                  >
                    <span className={styles.dot}></span>
                    <span className={styles.ext}>.com</span>
                  </div>
                  <div
                    className={`${styles.statusItem} ${
                      availability.ai ? styles.available : styles.taken
                    }`}
                  >
                    <span className={styles.dot}></span>
                    <span className={styles.ext}>.ai</span>
                  </div>
                  <div
                    className={`${styles.statusItem} ${
                      availability.tm ? styles.available : styles.taken
                    }`}
                  >
                    <span className={styles.dot}></span>
                    <span className={styles.ext}>TM</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
