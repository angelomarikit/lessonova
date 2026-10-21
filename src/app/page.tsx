import { FallingLeaves } from "@/components/marketing/falling-leaves";
import { FaqSection } from "@/components/marketing/faq-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { PlatformCompatibilitySection } from "@/components/marketing/platform-compatibility-section";
import { ProductDemoSection } from "@/components/marketing/product-demo-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getPublicSubscriptionPlans } from "@/lib/plans/get-public-plans";

export default async function HomePage() {
  const { plans, source } = await getPublicSubscriptionPlans();

  return (
    <>
      <FallingLeaves />
      <SiteHeader />
      <main className="relative z-[2]">
        <HeroSection />
        <FeaturesSection />
        <PlatformCompatibilitySection />
        <HowItWorksSection />
        <ProductDemoSection />
        <PricingSection plans={plans} source={source} />
        <FaqSection />
      </main>
      <SiteFooter className="relative z-[2]" />
    </>
  );
}
