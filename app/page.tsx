import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ComparisonSection } from "@/components/ComparisonSection";
import { HowItWorks } from "@/components/HowItWorks";
import { MissionPreview } from "@/components/MissionPreview";
import { SkillsGrid } from "@/components/SkillsGrid";
import { CareerPath } from "@/components/CareerPath";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <ComparisonSection />
        <HowItWorks />
        {/* Mission preview and skills share a row on desktop */}
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:px-8 lg:py-20">
          <MissionPreview />
          <SkillsGrid />
        </div>
        <CareerPath />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
