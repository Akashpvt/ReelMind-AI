"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerContainer } from "@/lib/animations";

const AiOrb = dynamic(() => import("@/components/three/ai-orb").then((mod) => mod.AiOrb), {
  ssr: false,
});

const particles = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${(index * 31 + 8) % 100}%`,
  top: `${(index * 47 + 12) % 100}%`,
  delay: (index % 8) * 0.34,
  duration: 5.5 + (index % 7) * 0.7,
}));

const floatingLabels = [
  { label: "AI Storyboard", className: "left-2 top-8 sm:left-8 sm:top-12" },
  { label: "Voice Sync", className: "right-3 top-24 sm:right-8 sm:top-20" },
  { label: "Scene Builder", className: "left-0 bottom-28 sm:left-5 sm:bottom-32" },
  { label: "Cinematic Export", className: "right-1 bottom-16 sm:right-10 sm:bottom-24" },
  { label: "Creator Pipeline", className: "left-1/2 top-2 -translate-x-1/2 sm:top-4" },
];

const workflowSteps = ["Prompt", "Script", "Storyboard", "Voiceover", "Thumbnail", "Video Production"];

const capabilityCards = [
  "Viral Hook",
  "Reel Script",
  "Storyboard",
  "Voiceover",
  "Thumbnail Generator",
  "Export Package",
  "Credits System",
  "AI Production Timeline",
];

const timelineScenes = [
  { time: "00:00", title: "Hook scene", tone: "Pattern interrupt" },
  { time: "00:04", title: "B-roll", tone: "Cinematic proof" },
  { time: "00:12", title: "Voiceover", tone: "Emotional rise" },
  { time: "00:24", title: "CTA ending", tone: "Export ready" },
];

export function Hero() {
  const [canRenderOrb, setCanRenderOrb] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) {
      return;
    }

    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    setCanRenderOrb(Boolean(context));
  }, []);

  return (
    <section
      id="hero"
      className="relative z-10 flex min-h-screen items-center overflow-hidden bg-[#050712] px-4 pb-14 pt-28 sm:pb-20 sm:pt-36 lg:pt-28"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_26rem),radial-gradient(circle_at_16%_30%,rgba(168,85,247,0.20),transparent_28rem),linear-gradient(135deg,#02040b_0%,#07111f_45%,#03040a_100%)]" />
        <div className="grid-mask absolute inset-0 opacity-40" />
        <div className="animate-gradient-drift absolute left-[18%] top-20 h-[26rem] w-[26rem] rounded-full bg-violetGlow/18 blur-[110px] sm:h-[42rem] sm:w-[42rem]" />
        <div className="absolute right-[4%] top-24 h-[24rem] w-[24rem] rounded-full bg-cyberBlue/14 blur-[120px] sm:h-[36rem] sm:w-[36rem]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#050712] via-[#050712]/78 to-transparent" />
        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="absolute h-1 w-1 rounded-full bg-glowCyan/80 shadow-[0_0_18px_rgba(103,232,249,0.75)]"
            style={{ left: particle.left, top: particle.top }}
            animate={{ y: [-16, 18, -16], opacity: [0.16, 0.82, 0.16], scale: [0.75, 1.35, 0.75] }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-[22rem] text-center sm:max-w-[42rem] lg:mx-0 lg:max-w-3xl lg:text-left"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyberBlue/20 bg-cyberBlue/[0.075] px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyberBlue backdrop-blur-xl sm:text-xs lg:mx-0"
          >
            <span className="h-2 w-2 rounded-full bg-cyberBlue shadow-[0_0_18px_rgba(56,189,248,1)]" />
            ReelMind AI
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="shine-text text-balance text-[clamp(3rem,14vw,5.15rem)] font-semibold leading-[0.92] tracking-[-0.065em] sm:text-7xl lg:text-[5.7rem]"
          >
            The operating system for creative agencies.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-[21rem] text-[0.96rem] leading-7 text-mist sm:mt-7 sm:max-w-[40rem] sm:text-xl sm:leading-8 lg:mx-0"
          >
            Run leads, client projects, AI production, approvals, files, invoices, and analytics from one premium workspace.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mx-auto mt-7 flex w-full max-w-[21rem] flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4 lg:mx-0 lg:justify-start"
          >
            <Button href="/signup" className="w-full px-6 sm:w-auto sm:px-7">
              Start Free
            </Button>
            <Button href="/demo" variant="secondary" className="w-full px-6 sm:w-auto sm:px-7">
              Book Demo
            </Button>
            <Button href="/pricing" variant="ghost" className="w-full px-6 sm:w-auto sm:px-7">View Pricing</Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mx-auto mt-8 flex max-w-[22rem] flex-wrap justify-center gap-2 sm:max-w-2xl lg:mx-0 lg:justify-start"
          >
            {capabilityCards.map((card) => (
              <span
                key={card}
                className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[0.7rem] font-medium text-mist backdrop-blur-xl transition hover:border-cyberBlue/30 hover:text-frost"
              >
                {card}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 26 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative mx-auto aspect-video w-full max-w-[42rem] lg:max-w-[46rem]"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-cyberBlue/10 blur-3xl" />
          <CreatorDashboard canRenderOrb={canRenderOrb} />
          {floatingLabels.map((item, index) => (
            <motion.div
              key={item.label}
              className={`pointer-events-none absolute hidden rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-frost shadow-[0_18px_48px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:block ${item.className}`}
              animate={{ y: [-4, 6, -4], opacity: [0.72, 1, 0.72] }}
              transition={{ duration: 5 + index * 0.45, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
            >
              {item.label}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CreatorDashboard({ canRenderOrb }: { canRenderOrb: boolean }) {
  return (
    <div className="glass-panel relative h-full overflow-hidden rounded-[1.4rem] border-white/15 p-3 shadow-[0_28px_110px_rgba(0,0,0,0.50),0_0_70px_rgba(56,189,248,0.08)] sm:rounded-[2rem] sm:p-4">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyberBlue/70 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyberBlue/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-violetGlow/18 blur-3xl" />

      <div className="relative z-[1] flex h-full min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FB7185]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
            <p className="ml-2 hidden text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-mist sm:block">
              AI Production Dashboard
            </p>
          </div>
          <span className="rounded-full border border-[#34D399]/20 bg-[#34D399]/10 px-2.5 py-1 text-[0.65rem] font-medium text-[#6EE7B7]">
            Live pipeline
          </span>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_0.82fr]">
          <div className="grid min-w-0 gap-3">
            <div className="rounded-2xl border border-white/10 bg-ink/50 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-cyberBlue">
                    Creator workflow
                  </p>
                  <p className="mt-1 text-sm font-semibold text-frost">Prompt to production pipeline</p>
                </div>
                <span className="rounded-full border border-violetGlow/20 bg-violetGlow/10 px-2.5 py-1 text-[0.62rem] text-violetGlow">
                  84% export
                </span>
              </div>
              <WorkflowRail />
            </div>

            <div className="grid min-h-0 gap-3 sm:grid-cols-2">
              <StoryboardFrames />
              <VoiceWaveform />
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            <div className="relative min-h-[10rem] overflow-hidden rounded-2xl border border-white/10 bg-ink/55 p-3 sm:p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(56,189,248,0.26),transparent_34%),radial-gradient(circle_at_22%_80%,rgba(168,85,247,0.28),transparent_38%)]" />
              <div className="relative z-[1] h-32 sm:h-40">
                {canRenderOrb ? <AiOrb /> : <OrbFallback />}
              </div>
              <div className="relative z-[2] -mt-5 rounded-xl border border-white/10 bg-ink/60 p-3 backdrop-blur-xl">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-cyberBlue">
                  Thumbnail preview
                </p>
                <p className="mt-2 text-sm font-semibold leading-5 text-frost">
                  Cinematic creator standing inside a neon production room.
                </p>
              </div>
            </div>

            <ProductionTimeline />
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowRail() {
  return (
    <div className="hide-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
      {workflowSteps.map((step, index) => (
        <div key={step} className="flex shrink-0 items-center gap-2">
          <div className="rounded-full border border-cyberBlue/20 bg-cyberBlue/[0.08] px-3 py-2 text-[0.68rem] font-medium text-frost">
            {step}
          </div>
          {index < workflowSteps.length - 1 ? <span className="h-px w-5 bg-gradient-to-r from-cyberBlue/70 to-violetGlow/70" /> : null}
        </div>
      ))}
    </div>
  );
}

function StoryboardFrames() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-violetGlow">Storyboard frames</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((frame) => (
          <div
            key={frame}
            className="aspect-[4/5] rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(168,85,247,0.14)),radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.18),transparent_34%)]"
          >
            <div className="m-2 h-1.5 w-8 rounded-full bg-white/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceWaveform() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-cyberBlue">AI voice waveform</p>
      <div className="mt-4 flex h-20 items-center gap-1.5">
        {Array.from({ length: 20 }, (_, index) => (
          <motion.span
            key={index}
            className="w-1 flex-1 rounded-full bg-gradient-to-t from-violetGlow to-cyberBlue"
            animate={{ height: [`${18 + (index % 5) * 8}%`, `${42 + (index % 7) * 7}%`, `${18 + (index % 5) * 8}%`] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.045 }}
          />
        ))}
      </div>
    </div>
  );
}

function ProductionTimeline() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-cyberBlue">AI timeline</p>
        <span className="status-pulse h-2 w-2 rounded-full bg-[#34D399]" />
      </div>
      <div className="space-y-2.5">
        {timelineScenes.map((scene) => (
          <div key={scene.time} className="flex gap-3 rounded-xl border border-white/[0.08] bg-ink/35 p-2.5">
            <span className="shrink-0 rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-2 py-1 text-[0.62rem] text-cyberBlue">
              {scene.time}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-frost">{scene.title}</p>
              <p className="mt-0.5 truncate text-[0.68rem] text-mist">{scene.tone}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violetGlow via-cyberBlue to-glowCyan"
          animate={{ width: ["18%", "84%", "18%"] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function OrbFallback() {
  return (
    <div className="absolute inset-[12%] animate-float rounded-full" aria-hidden="true">
      <div className="absolute inset-[18%] rounded-full border border-violetGlow/45 bg-[radial-gradient(circle,rgba(168,85,247,0.32),rgba(13,18,34,0.12)_58%,transparent_72%)] shadow-[0_0_65px_rgba(168,85,247,0.22)]" />
      <div className="absolute inset-[10%] rounded-full border border-cyberBlue/30 shadow-[0_0_48px_rgba(56,189,248,0.18)]" />
      <div className="absolute inset-[4%] rotate-12 rounded-full border border-violetGlow/20" />
    </div>
  );
}
