"use client";

import { useMemo } from "react";
import { getSmartRecommendations, retrieveMemory, seedCreatorMemories, type CreatorMemory } from "@/lib/memory";
import type { ReelProject as Project } from "@/lib/reel-projects";

type CreatorMemoryVaultPanelProps = {
  project: Project | null;
};

const categoryLabels: Record<CreatorMemory["category"], string> = {
  hook: "Hook",
  title: "Title",
  thumbnail: "Thumbnail",
  audience: "Audience",
  pattern: "Pattern",
};

function categoryTone(category: CreatorMemory["category"]) {
  if (category === "hook") return "border-cyberBlue/25 bg-cyberBlue/10 text-cyberBlue";
  if (category === "title") return "border-violetGlow/25 bg-violetGlow/10 text-violetGlow";
  if (category === "thumbnail") return "border-[#34D399]/25 bg-[#34D399]/10 text-[#6EE7B7]";
  if (category === "audience") return "border-[#FBBF24]/25 bg-[#FBBF24]/10 text-[#FDE68A]";
  return "border-white/15 bg-white/[0.05] text-mist";
}

export function CreatorMemoryVaultPanel({ project }: CreatorMemoryVaultPanelProps) {
  const niche = project?.niche ?? "AI";
  const query = project?.prompt ?? project?.title ?? "";
  const memories = useMemo(() => seedCreatorMemories(niche), [niche]);
  const recommendations = useMemo(() => getSmartRecommendations(niche, query), [niche, query]);
  const topHooks = useMemo(() => retrieveMemory({ niche, category: "hook", memories, limit: 3 }), [memories, niche]);
  const topTitles = useMemo(() => retrieveMemory({ niche, category: "title", memories, limit: 3 }), [memories, niche]);
  const topThumbnails = useMemo(() => retrieveMemory({ niche, category: "thumbnail", memories, limit: 3 }), [memories, niche]);
  const audienceSignals = useMemo(() => retrieveMemory({ niche, category: "audience", memories, limit: 3 }), [memories, niche]);
  const winningPatterns = useMemo(() => retrieveMemory({ niche, category: "pattern", memories, limit: 4 }), [memories, niche]);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Creator Memory Vault</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Long-term creator intelligence</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Store winning hooks, titles, thumbnails, audience signals, and performance patterns so future agents can adapt before generating.
          </p>
        </div>
        <div className="rounded-2xl border border-cyberBlue/20 bg-cyberBlue/[0.06] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyberBlue">Memory Niche</p>
          <p className="mt-1 text-sm font-medium text-frost">{niche}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-cyberBlue/15 bg-cyberBlue/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Smart Recommendations Before Generation</p>
          <div className="mt-4 space-y-3">
            <RecommendationCard label="Top Similar Hook" memory={recommendations.topSimilarHook} />
            <RecommendationCard label="Top Similar Title" memory={recommendations.topSimilarTitle} />
            <RecommendationCard label="Best Historical Pattern" memory={recommendations.bestHistoricalPattern} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Winning Patterns</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {winningPatterns.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} compact />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <MemoryColumn title="Top Hooks" memories={topHooks} />
        <MemoryColumn title="Top Titles" memories={topTitles} />
        <MemoryColumn title="Top Thumbnails" memories={topThumbnails} />
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Audience Signals</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {audienceSignals.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecommendationCard({ label, memory }: { label: string; memory: CreatorMemory }) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-ink/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">{label}</p>
        <span className="rounded-full border border-[#34D399]/25 bg-[#34D399]/10 px-2.5 py-1 text-[10px] text-[#6EE7B7]">{memory.score}% score</span>
      </div>
      <p className="mt-2 text-sm font-medium text-frost">{memory.content}</p>
      <p className="mt-2 text-xs leading-5 text-mist">{memory.pattern}</p>
    </article>
  );
}

function MemoryColumn({ title, memories }: { title: string; memories: CreatorMemory[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">{title}</p>
      <div className="mt-4 space-y-3">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  );
}

function MemoryCard({ memory, compact = false }: { memory: CreatorMemory; compact?: boolean }) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-ink/35 p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[10px] ${categoryTone(memory.category)}`}>{categoryLabels[memory.category]}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-mist">{memory.score}% memory score</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-frost">{memory.title}</p>
      <p className={`mt-2 text-xs leading-5 text-mist ${compact ? "line-clamp-2" : ""}`}>{memory.content}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-mist sm:grid-cols-5">
        <Metric label="Views" value={`${Math.round(memory.metrics.views / 1000)}k`} />
        <Metric label="CTR" value={`${memory.metrics.ctr}%`} />
        <Metric label="Retention" value={`${memory.metrics.retention}%`} />
        <Metric label="Engage" value={`${memory.metrics.engagement}%`} />
        <Metric label="Conv" value={`${memory.metrics.conversion}%`} />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-2 py-1.5">
      <p className="truncate uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-0.5 font-medium text-frost">{value}</p>
    </div>
  );
}
