import { getSubscriptionDetails } from "@/lib/subscription";
import NameRadarLanding from "@/components/nameradar/nameradar-landing";

export default async function Home() {
  const subscriptionDetails = await getSubscriptionDetails();

  return <NameRadarLanding subscriptionDetails={subscriptionDetails} />;
}
