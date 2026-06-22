"use client";

import dynamic from "next/dynamic";
import { BackgroundEffects } from "@/components/effects/background-effects";
import { Footer } from "@/components/sections/footer";
import { AgencyShowcase } from "@/components/sections/agency-showcase";

const Navbar = dynamic(() => import("@/components/sections/navbar").then((mod) => mod.Navbar), {
  ssr: false,
});

const Hero = dynamic(() => import("@/components/sections/hero").then((mod) => mod.Hero), {
  ssr: false,
});

const Features = dynamic(() => import("@/components/sections/features").then((mod) => mod.Features), {
  ssr: false,
});

const Pricing = dynamic(() => import("@/components/sections/pricing").then((mod) => mod.Pricing), {
  ssr: false,
});

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="grid-mask pointer-events-none fixed inset-0 z-0 opacity-60" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.18),transparent_42rem)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(0,0,0,0.62)_100%)]" />
      <BackgroundEffects />
      <Navbar />
      <Hero />
      <Features />
      <AgencyShowcase />
      <Pricing />
      <Footer />
    </main>
  );
}
