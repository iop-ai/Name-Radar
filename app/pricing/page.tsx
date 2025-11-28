import { getSubscriptionDetails } from "@/lib/subscription";
import PricingTable from "./_component/pricing-table";
import Link from "next/link";

export default async function PricingPage() {
  const subscriptionDetails = await getSubscriptionDetails();

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#fbfbfd]">
      {/* Simple Navbar */}
      <nav className="w-full px-8 py-6 flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">
          NameRadar.ai
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/" className="text-sm hover:opacity-70">
            Generate
          </Link>
          <Link href="/pricing" className="text-sm font-medium">
            Pricing
          </Link>
          <Link href="/sign-in">
            <button className="px-4 py-2 text-sm border rounded-full hover:bg-black hover:text-white transition-colors">
              Login
            </button>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <PricingTable subscriptionDetails={subscriptionDetails} />
      </div>
    </div>
  );
}
