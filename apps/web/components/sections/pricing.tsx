"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { fadeUp, staggerContainer } from "@/lib/animations";

const plans = [
  {
    name: "Free",
    price: "Rs. 0",
    description: "Try ReelMind AI with the core creator workflow.",
    features: ["20 credits", "Thumbnail generation", "Storyboard generation", "Usage history"],
    href: "/signup",
  },
  {
    name: "Starter",
    price: "Rs. 999",
    description: "For solo agencies building a reliable client workflow.",
    features: ["1,000 credits", "50 CRM leads", "10 active projects", "3 team seats"],
    href: "/billing?plan=starter",
  },
  {
    name: "Pro",
    price: "Rs. 2,999",
    description: "For growing teams managing production and approvals at scale.",
    features: ["5,000 credits", "Client portal", "Advanced analytics", "10 team seats"],
    href: "/billing?plan=pro",
    featured: true,
  },
  {
    name: "Agency",
    price: "Rs. 7,999",
    description: "For established agencies with high-volume client delivery.",
    features: ["20,000 credits", "250 active projects", "Priority support", "50 team seats"],
    href: "/billing?plan=agency",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative z-10 px-4 py-20 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Plans that scale"
          title="Start lean. Grow without switching systems."
          description="Choose the capacity that fits today, then scale your clients, projects, team, and AI production in one place."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              whileHover={{ y: -8, rotateX: 2, rotateY: plan.featured ? 0 : -2 }}
              transition={{ type: "spring", stiffness: 190, damping: 24 }}
              className={`glass-panel animated-surface relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transform-gpu sm:p-7 ${
                plan.featured ? "neon-border popular-plan lg:scale-[1.02]" : ""
              }`}
            >
              {plan.featured ? (
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-violetGlow/22 to-transparent" />
              ) : null}
              {plan.featured ? (
                <div className="absolute right-5 top-5 rounded-full border border-cyberBlue/30 bg-cyberBlue/15 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cyberBlue shadow-blue-glow sm:right-6 sm:top-6">
                  Popular
                </div>
              ) : null}
              <p className="relative text-[0.65rem] font-semibold uppercase tracking-[0.27em] text-cyberBlue">
                {plan.featured ? "Most popular" : "Agency plan"}
              </p>
              <h3 className="relative mt-3 text-2xl font-semibold text-frost">{plan.name}</h3>
              <p className="mt-4 min-h-[3rem] leading-6 text-mist">{plan.description}</p>
              <div className="relative mt-8 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-normal text-frost">{plan.price}</span>
              </div>
              <Button href={plan.href} variant={plan.featured ? "primary" : "secondary"} className="mt-7 w-full">
                Choose {plan.name}
              </Button>
              <div className="relative mt-7 space-y-3.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm leading-6 text-mist">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyberBlue shadow-blue-glow" />
                    {feature}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
        <div className="mt-8 text-center">
          <Button href="/pricing" variant="secondary">Compare every feature</Button>
        </div>
      </div>
    </section>
  );
}
