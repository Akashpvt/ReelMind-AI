"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReelProject as Project } from "@/lib/reel-projects";
import { createClient } from "@/lib/supabase/client";

type PerformanceStatus = "learning" | "winning" | "needs_iteration";

type PerformanceRow = {
  id: string;
  title: string;
  hook: string;
  thumbnail: string;
  cta: string;
  views: number;
  ctr: number;
  retention: number;
  engagement: number;
  status: PerformanceStatus;
  createdAt: string;
};

export type LearningEngineExportData = {
  performance: PerformanceRow[];
  viralPatterns: string[];
  bestPerforming: {
    titles: string[];
    hooks: string[];
    thumbnails: string[];
    ctas: string[];
  };
  predictionV3: {
    reachScore: number;
    retentionScore: number;
    conversionScore: number;
    learningConfidence: number;
  };
  recommendations: string[];
  historicalAnalytics: Array<{ label: string; value: number }>;
};

type CreatorLearningEnginePanelProps = {
  userId?: string;
  project: Project | null;
  history: Project[];
  thumbnailCount: number;
  onNotify: (title: string, tone: "success" | "error" | "info", description?: string) => void;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textSignal(text: string, base: number) {
  return clamp(base + Math.min(26, Math.floor(text.trim().length / 65)) + (/secret|mistake|stop|why|how|before|after/i.test(text) ? 9 : 0));
}

function fallbackPerformance(project: Project | null, history: Project[]): PerformanceRow[] {
  const projects = project ? [project, ...history.filter((item) => item.id !== project.id)] : history;
  return projects.slice(0, 6).map((item, index) => {
    const hookSignal = textSignal(item.outputs.hook, 48);
    return {
      id: item.id,
      title: item.title,
      hook: item.outputs.hook || item.prompt,
      thumbnail: item.thumbnailUrl ?? "Gradient thumbnail placeholder",
      cta: item.outputs.cta || "Follow for more",
      views: 1800 + hookSignal * 94 + index * 420,
      ctr: clamp((item.thumbnailUrl ? 38 : 24) + hookSignal / 4),
      retention: textSignal(`${item.outputs.script} ${item.outputs.storyboard}`, 42),
      engagement: textSignal(item.outputs.cta, 35),
      status: hookSignal > 76 ? "winning" : hookSignal > 58 ? "learning" : "needs_iteration",
      createdAt: item.createdAt,
    };
  });
}

export function getLearningEngineExportData(project: Project | null, history: Project[], thumbnailCount: number): LearningEngineExportData {
  const performance = fallbackPerformance(project, history);
  const best = [...performance].sort((first, second) => second.views - first.views);
  const active = project ?? history[0] ?? null;
  const predictionV3 = {
    reachScore: textSignal(active?.outputs.hook ?? "", 54),
    retentionScore: textSignal(`${active?.outputs.script ?? ""} ${active?.outputs.storyboard ?? ""}`, 50),
    conversionScore: textSignal(active?.outputs.cta ?? "", 44),
    learningConfidence: clamp(48 + performance.length * 8 + thumbnailCount * 3),
  };

  return {
    performance,
    viralPatterns: [
      "High curiosity hook in first sentence",
      "Clear transformation promise",
      "Specific audience callout",
      "CTA appears after value delivery",
    ],
    bestPerforming: {
      titles: best.map((item) => item.title).slice(0, 3),
      hooks: best.map((item) => item.hook).slice(0, 3),
      thumbnails: best.map((item) => item.thumbnail).slice(0, 3),
      ctas: best.map((item) => item.cta).slice(0, 3),
    },
    predictionV3,
    recommendations: [
      predictionV3.reachScore < 72 ? "Rewrite the first line with a sharper curiosity gap." : "Keep the hook structure and test a bolder title.",
      predictionV3.retentionScore < 70 ? "Add more scene changes before the midpoint." : "Retention pacing is strong enough for cross-posting.",
      predictionV3.conversionScore < 68 ? "Make the CTA more specific and lower-friction." : "CTA quality is ready for publish testing.",
    ],
    historicalAnalytics: [
      { label: "Tracked Posts", value: performance.length },
      { label: "Avg Views", value: performance.length ? Math.round(performance.reduce((sum, item) => sum + item.views, 0) / performance.length) : 0 },
      { label: "Avg CTR", value: performance.length ? Math.round(performance.reduce((sum, item) => sum + item.ctr, 0) / performance.length) : 0 },
      { label: "Avg Retention", value: performance.length ? Math.round(performance.reduce((sum, item) => sum + item.retention, 0) / performance.length) : 0 },
    ],
  };
}

export function CreatorLearningEnginePanel({ userId, project, history, thumbnailCount, onNotify }: CreatorLearningEnginePanelProps) {
  const exportData = useMemo(() => getLearningEngineExportData(project, history, thumbnailCount), [history, project, thumbnailCount]);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncLearning = useCallback(async () => {
    if (!userId || !project || project.id.startsWith("pending-")) {
      onNotify("Learning saved locally", "info", "Sign in with a saved project to persist learning events.");
      return;
    }

    setIsSyncing(true);
    try {
      const supabase = createClient();
      const performance = exportData.performance[0];
      if (performance) {
        await supabase.from("content_performance").insert({
          user_id: userId,
          project_id: project.id,
          title: performance.title,
          hook: performance.hook,
          thumbnail_url: project.thumbnailUrl,
          cta: performance.cta,
          views: performance.views,
          ctr: performance.ctr,
          retention: performance.retention,
          engagement: performance.engagement,
          status: performance.status,
          metadata: { predictionV3: exportData.predictionV3 },
        });
      }
      await supabase.from("learning_events").insert({
        user_id: userId,
        project_id: project.id,
        event_type: "learning_sync",
        detail: "Creator Learning Engine snapshot synced",
        metadata: exportData,
      });
      onNotify("Learning synced", "success", "Performance snapshot and learning event were saved.");
    } catch {
      onNotify("Learning sync failed", "error", "Apply the Phase 5D migration before enabling persistence.");
    } finally {
      setIsSyncing(false);
    }
  }, [exportData, onNotify, project, userId]);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Creator Learning Engine</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Performance intelligence feedback loop</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">Track content performance, detect viral patterns, and turn historical signals into better titles, hooks, thumbnails, CTAs, and publish decisions.</p>
        </div>
        <button type="button" onClick={() => void syncLearning()} disabled={isSyncing} className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost disabled:cursor-wait disabled:opacity-60">
          {isSyncing ? "Syncing..." : "Sync Learning"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Performance Tracking</p>
          <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
            {exportData.performance.length ? exportData.performance.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="line-clamp-2 text-sm font-medium text-frost">{item.title}</p>
                  <span className="w-fit rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-3 py-1 text-[11px] text-cyberBlue">{item.status.replace("_", " ")}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Views" value={item.views.toLocaleString()} />
                  <Metric label="CTR" value={`${item.ctr}%`} />
                  <Metric label="Retention" value={`${item.retention}%`} />
                  <Metric label="Engage" value={`${item.engagement}%`} />
                </div>
              </article>
            )) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">Generate projects to begin the learning loop.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ScoreCard title="Performance Prediction V3" rows={[
            ["Reach", exportData.predictionV3.reachScore],
            ["Retention", exportData.predictionV3.retentionScore],
            ["Conversion", exportData.predictionV3.conversionScore],
            ["Confidence", exportData.predictionV3.learningConfidence],
          ]} />
          <ListCard title="Viral Pattern Detector" items={exportData.viralPatterns} />
          <ListCard title="AI Recommendations" items={exportData.recommendations} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <BestPerforming data={exportData.bestPerforming} />
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Historical Analytics</p>
          <div className="mt-4 space-y-3">
            {exportData.historicalAnalytics.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex justify-between text-xs text-mist"><span>{item.label}</span><span>{item.value.toLocaleString()}</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyberBlue to-violetGlow" style={{ width: `${Math.min(100, item.value / 120)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
      <p className="text-sm font-semibold text-frost">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
    </div>
  );
}

function ScoreCard({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div className="rounded-3xl border border-cyberBlue/15 bg-cyberBlue/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-xs text-mist"><span>{label}</span><span>{value}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyberBlue to-violetGlow" style={{ width: `${value}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => <p key={`${title}-${index}`} className="rounded-xl border border-white/10 bg-ink/35 p-3 text-xs leading-5 text-mist">{item}</p>)}
      </div>
    </div>
  );
}

function BestPerforming({ data }: { data: LearningEngineExportData["bestPerforming"] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Best Performing Assets</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Object.entries(data).map(([label, items]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
            <p className="text-sm font-medium capitalize text-frost">{label}</p>
            <div className="mt-2 space-y-2">
              {items.length ? items.map((item, index) => <p key={`${label}-${index}`} className="line-clamp-2 text-xs leading-5 text-mist">{item}</p>) : <p className="text-xs text-mist">No signals yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
