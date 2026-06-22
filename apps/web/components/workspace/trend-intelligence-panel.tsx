"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  detectViralPatterns,
  findContentGaps,
  generateCompetitorReports,
  generateRecommendedIdeas,
  generateTrendReports,
  type CompetitorReport,
  type ContentGap,
  type TrendReport,
  type ViralPattern,
} from "@/lib/trends";

type ReelIdea = ReturnType<typeof generateRecommendedIdeas>[number];

export type TrendIntelligenceExportData = {
  niche: string;
  trends: TrendReport[];
  viralPatterns: ViralPattern[];
  competitors: CompetitorReport[];
  contentGaps: ContentGap[];
  ideas: ReelIdea[];
  activity: string[];
};

const niches = ["AI", "Education", "Finance", "Fitness", "Startup", "Politics"];

export function getTrendIntelligenceExportData(niche = "AI"): TrendIntelligenceExportData {
  return {
    niche,
    trends: generateTrendReports(niche),
    viralPatterns: detectViralPatterns(niche),
    competitors: generateCompetitorReports(niche),
    contentGaps: findContentGaps(niche),
    ideas: generateRecommendedIdeas(niche),
    activity: ["Trend Scan Complete", "Pattern Analysis Complete", "Content Gap Found", "Ideas Generated"],
  };
}

export function TrendIntelligencePanel() {
  const [niche, setNiche] = useState("AI");
  const [activeNiche, setActiveNiche] = useState("AI");
  const data = useMemo(() => getTrendIntelligenceExportData(activeNiche), [activeNiche]);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Trend Intelligence</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Research Agent trend operating system</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">Scan deterministic trend signals, competitor patterns, content gaps, and high-scoring reel ideas before generation.</p>
        </div>
        <button type="button" onClick={() => setActiveNiche(niche)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost">
          Scan Trends
        </button>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
            Niche
            <select value={niche} onChange={(event) => setNiche(event.target.value)} className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none">
              {niches.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <p className="text-sm text-mist">Active scan: <span className="text-frost">{activeNiche}</span></p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.trends.map((trend) => (
            <article key={trend.id} className="rounded-2xl border border-white/10 bg-ink/35 p-4">
              <p className="text-base font-semibold text-frost">{trend.keyword}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric label="Growth" value={trend.growth} />
                <Metric label="Comp." value={trend.competition} />
                <Metric label="Opp." value={trend.opportunity} />
                <Metric label="Conf." value={Math.round(trend.confidence)} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Viral Pattern Detector">
          <div className="space-y-3">
            {data.viralPatterns.map((pattern) => (
              <article key={pattern.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-frost">{pattern.pattern}</p>
                  <span className="rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-3 py-1 text-xs text-cyberBlue">{pattern.score}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-mist">{pattern.examples.join(" / ")}</p>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Competitor Intelligence">
          <div className="space-y-3">
            {data.competitors.map((competitor) => (
              <article key={competitor.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <p className="text-sm font-semibold text-frost">{competitor.creator}</p>
                <p className="mt-1 text-xs text-mist">{competitor.avgViews.toLocaleString()} avg views / {competitor.postingFrequency}</p>
                <p className="mt-2 text-xs leading-5 text-mist">Hook: {competitor.hookPatterns[0]} / Thumbnail: {competitor.thumbnailPatterns[0]} / CTA: {competitor.ctaPatterns[0]}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Content Gap Opportunities">
          <div className="space-y-3">
            {data.contentGaps.map((gap) => (
              <article key={gap.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-frost">{gap.topic}</p>
                  <OpportunityBadge value={gap.opportunity} />
                </div>
                <p className="mt-2 text-xs text-mist">Demand {gap.demand} / Competition {gap.competition} / Opportunity {gap.opportunity}</p>
                <p className="mt-2 text-xs leading-5 text-mist">{gap.recommendation}</p>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="AI Idea Generator">
          <div className="grid gap-3 md:grid-cols-2">
            {data.ideas.map((idea) => (
              <article key={idea.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-semibold text-frost">{idea.title}</p>
                  <span className="rounded-full border border-violetGlow/20 bg-violetGlow/10 px-2.5 py-1 text-[11px] text-violetGlow">{idea.viralityScore}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-mist">{idea.hook}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-mist">{idea.audience}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Research Agent Activity Feed</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {data.activity.map((event) => (
            <div key={event} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
              <p className="text-sm text-frost">{event}</p>
              <p className="mt-1 text-xs text-mist">{new Date().toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">{title}</p>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
      <p className="text-lg font-semibold text-frost">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
    </div>
  );
}

function OpportunityBadge({ value }: { value: number }) {
  const label = value >= 75 ? "High Opportunity" : value >= 55 ? "Medium Opportunity" : "Low Opportunity";
  const tone = value >= 75 ? "border-[#34D399]/25 bg-[#34D399]/10 text-[#6EE7B7]" : value >= 55 ? "border-[#FBBF24]/25 bg-[#FBBF24]/10 text-[#FDE68A]" : "border-[#FB7185]/25 bg-[#FB7185]/10 text-[#FDA4AF]";
  return <span className={`w-fit rounded-full border px-3 py-1 text-[11px] ${tone}`}>{label}</span>;
}
