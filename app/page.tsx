import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TrustBar } from "@/components/TrustBar";
import { HowItWorks } from "@/components/HowItWorks";
import { MissionPreview } from "@/components/MissionPreview";
import { CareerPath } from "@/components/CareerPath";
import { SkillsGrid } from "@/components/SkillsGrid";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <TrustBar />
        <HowItWorks />
        <MissionPreview />
        <CareerPath />
        <SkillsGrid />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
