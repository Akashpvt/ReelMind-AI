"use client";

import { motion } from "framer-motion";
import { GlowCard } from "@/components/ui/glow-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { fadeUp, staggerContainer } from "@/lib/animations";

const features = [
  {
    title: "Lead pipeline",
    description: "Capture opportunities, track every follow-up, and convert won work directly into delivery.",
    stat: "CRM built in",
    mark: "01",
  },
  {
    title: "AI production",
    description: "Move from brief to scripts, storyboards, voice, thumbnails, and delivery-ready assets.",
    stat: "One workflow",
    mark: "02",
  },
  {
    title: "Client delivery",
    description: "Give clients one polished place for feedback, approvals, files, messages, and invoices.",
    stat: "Branded portal",
    mark: "03",
  },
  {
    title: "Agency intelligence",
    description: "Understand revenue, capacity, project health, and top clients while there is time to act.",
    stat: "Live analytics",
    mark: "04",
  },
];

export function Features() {
  return (
    <section id="features" className="relative z-10 px-4 py-20 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="One connected platform"
          title="Everything your agency needs to move work forward."
          description="ReelMind AI connects the commercial, creative, and client sides of delivery—so your team keeps context and momentum."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid items-stretch gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={fadeUp} className="[perspective:1200px]">
              <GlowCard className="min-h-[16.5rem] sm:min-h-[18rem]">
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [0, 4, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_26px_rgba(56,189,248,0.08)]"
                >
                  <span className="text-xs font-bold tracking-[0.22em] text-cyberBlue">{feature.mark}</span>
                </motion.div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyberBlue">{feature.stat}</p>
                <h3 className="mt-4 text-[1.35rem] font-semibold leading-tight tracking-[-0.03em] text-frost sm:text-2xl">{feature.title}</h3>
                <p className="mt-4 leading-7 text-mist/90">{feature.description}</p>
              </GlowCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
