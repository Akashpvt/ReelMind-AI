"use client";

import { useMemo, useState } from "react";
import type { GeneratedOutputs } from "@/lib/reel-generation";
import type { ReelProject as Project } from "@/lib/reel-projects";
import type { VideoAsset } from "@/components/workspace/video-studio-panel";
import type { VoiceAsset } from "@/components/workspace/voice-asset-panel";

export type CalendarStatus = "Idea" | "Draft" | "Generated" | "Scheduled" | "Published";
type CalendarView = "Month" | "Week" | "List";
type LibraryCategory = "Scripts" | "Storyboards" | "Voiceovers" | "Thumbnails" | "Videos";
type BoardColumn = "Ideas" | "In Progress" | "Generated" | "Published";

export type WorkspaceExportData = {
  calendar: Array<{ title: string; platform: string; publishDate: string; status: CalendarStatus }>;
  library: Array<{ category: LibraryCategory; title: string; detail: string; updatedAt: string }>;
  score: {
    hook: number;
    retention: number;
    visualStrength: number;
    ctaQuality: number;
    overall: number;
  };
  analytics: {
    projectsCreated: number;
    videosGenerated: number;
    voiceAssets: number;
    thumbnailAssets: number;
  };
  destinations: Array<{ name: string; status: "mock" }>;
};

type CreatorWorkspacePanelProps = {
  project: Project | null;
  history: Project[];
  voiceAsset: VoiceAsset | null;
  videoAssets: VideoAsset[];
  thumbnailCount: number;
  usage: {
    totalProjects: number;
    videoGenerations: number;
    imageGenerations: number;
  };
};

const statuses: CalendarStatus[] = ["Idea", "Draft", "Generated", "Scheduled", "Published"];
const boardColumns: BoardColumn[] = ["Ideas", "In Progress", "Generated", "Published"];
const destinations = ["YouTube", "Instagram", "TikTok", "Facebook"];
const platforms = ["Instagram", "YouTube", "TikTok", "Facebook"];
const libraryFilters: Array<LibraryCategory | "All"> = ["All", "Scripts", "Storyboards", "Voiceovers", "Thumbnails", "Videos"];
const librarySorts = ["Recent", "Category"];

function todayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function scoreFromText(text: string, base: number) {
  const lengthLift = Math.min(18, Math.floor(text.trim().length / 90));
  const punchLift = /hook|wait|secret|why|stop|imagine|mistake/i.test(text) ? 7 : 0;
  return Math.min(96, base + lengthLift + punchLift);
}

export function getCreatorWorkspaceExportData({
  project,
  history,
  voiceAsset,
  videoAssets,
  thumbnailCount,
  usage,
}: CreatorWorkspacePanelProps): WorkspaceExportData {
  const outputs = project?.outputs;
  const library = buildLibrary(project, outputs, voiceAsset, videoAssets);
  const score = buildScore(outputs);

  return {
    calendar: [
      {
        title: project?.title ?? "New reel concept",
        platform: "Instagram",
        publishDate: todayOffset(2),
        status: project ? "Generated" : "Idea",
      },
      {
        title: "Repurpose winning hook",
        platform: "YouTube",
        publishDate: todayOffset(5),
        status: "Draft",
      },
    ],
    library,
    score,
    analytics: {
      projectsCreated: usage.totalProjects || history.length,
      videosGenerated: usage.videoGenerations || videoAssets.length,
      voiceAssets: voiceAsset ? 1 : 0,
      thumbnailAssets: thumbnailCount,
    },
    destinations: destinations.map((name) => ({ name, status: "mock" })),
  };
}

export function CreatorWorkspacePanel(props: CreatorWorkspacePanelProps) {
  const { project, history, voiceAsset, videoAssets, thumbnailCount, usage } = props;
  const [calendarView, setCalendarView] = useState<CalendarView>("List");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryCategory, setLibraryCategory] = useState<LibraryCategory | "All">("All");
  const [librarySort, setLibrarySort] = useState<"Recent" | "Category">("Recent");
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [boardOverrides, setBoardOverrides] = useState<Record<string, BoardColumn>>({});
  const [draftPlanner, setDraftPlanner] = useState({
    title: project?.title ?? "",
    platform: "Instagram",
    publishDate: todayOffset(2),
    status: "Generated" as CalendarStatus,
  });

  const exportData = useMemo(
    () => getCreatorWorkspaceExportData({ project, history, voiceAsset, videoAssets, thumbnailCount, usage }),
    [history, project, thumbnailCount, usage, videoAssets, voiceAsset],
  );

  const library = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    return exportData.library
      .filter((item) => libraryCategory === "All" || item.category === libraryCategory)
      .filter((item) => !query || `${item.title} ${item.detail} ${item.category}`.toLowerCase().includes(query))
      .sort((first, second) =>
        librarySort === "Category"
          ? first.category.localeCompare(second.category)
          : Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
      );
  }, [exportData.library, libraryCategory, libraryQuery, librarySort]);

  const boardProjects = useMemo(
    () =>
      history.slice(0, 8).map((savedProject) => ({
        ...savedProject,
        boardStatus: boardOverrides[savedProject.id] ?? projectStatusToColumn(savedProject.status),
      })),
    [boardOverrides, history],
  );

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Creator Workspace</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Creator Operating System</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Plan, organize, score, and ship your full content pipeline from one cinematic workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Metric label="Score" value={exportData.score.overall} />
          <Metric label="Assets" value={exportData.library.length} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <PlannerCard
          view={calendarView}
          onViewChange={setCalendarView}
          draft={draftPlanner}
          onDraftChange={setDraftPlanner}
          calendar={exportData.calendar}
        />
        <ScoreCard score={exportData.score} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <LibraryCard
          query={libraryQuery}
          category={libraryCategory}
          sort={librarySort}
          items={library}
          onQueryChange={setLibraryQuery}
          onCategoryChange={setLibraryCategory}
          onSortChange={setLibrarySort}
        />
        <AnalyticsCard analytics={exportData.analytics} />
      </div>

      <BoardCard
        projects={boardProjects}
        draggedProjectId={draggedProjectId}
        onDragStart={setDraggedProjectId}
        onDrop={(column) => {
          if (draggedProjectId) {
            setBoardOverrides((current) => ({ ...current, [draggedProjectId]: column }));
            setDraggedProjectId(null);
          }
        }}
      />

      <PublishDestinations />
    </section>
  );
}

function buildLibrary(project: Project | null, outputs?: GeneratedOutputs, voiceAsset?: VoiceAsset | null, videoAssets: VideoAsset[] = []) {
  const createdAt = project?.updatedAt ?? new Date().toISOString();
  const rows: WorkspaceExportData["library"] = [];
  if (outputs?.script) rows.push({ category: "Scripts", title: project?.title ?? "Reel script", detail: outputs.script.slice(0, 160), updatedAt: createdAt });
  if (outputs?.storyboard) rows.push({ category: "Storyboards", title: "Storyboard scenes", detail: outputs.storyboard.slice(0, 160), updatedAt: createdAt });
  if (outputs?.voiceover) rows.push({ category: "Voiceovers", title: voiceAsset?.voice_name ?? "Voiceover script", detail: outputs.voiceover.slice(0, 160), updatedAt: voiceAsset?.created_at ?? createdAt });
  if (project?.thumbnailUrl) rows.push({ category: "Thumbnails", title: "Generated thumbnail", detail: project.thumbnailUrl, updatedAt: createdAt });
  videoAssets.forEach((asset) =>
    rows.push({
      category: "Videos",
      title: `${asset.provider.toUpperCase()} render`,
      detail: `${asset.duration_seconds}s / ${asset.resolution} / ${asset.status}`,
      updatedAt: asset.created_at,
    }),
  );
  return rows;
}

function buildScore(outputs?: GeneratedOutputs) {
  const hook = scoreFromText(outputs?.hook ?? "", 62);
  const retention = scoreFromText(`${outputs?.script ?? ""} ${outputs?.storyboard ?? ""}`, 58);
  const visualStrength = scoreFromText(`${outputs?.productionPack ?? ""} ${outputs?.videoPrompt ?? ""}`, 60);
  const ctaQuality = scoreFromText(outputs?.cta ?? "", 55);
  return {
    hook,
    retention,
    visualStrength,
    ctaQuality,
    overall: Math.round((hook + retention + visualStrength + ctaQuality) / 4),
  };
}

function projectStatusToColumn(status: Project["status"]): BoardColumn {
  if (status === "draft") return "In Progress";
  if (status === "archived") return "Published";
  return "Generated";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-lg font-semibold text-frost">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
    </div>
  );
}

function PlannerCard({ view, onViewChange, draft, onDraftChange, calendar }: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  draft: { title: string; platform: string; publishDate: string; status: CalendarStatus };
  onDraftChange: (draft: { title: string; platform: string; publishDate: string; status: CalendarStatus }) => void;
  calendar: WorkspaceExportData["calendar"];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Content Calendar</p>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {(["Month", "Week", "List"] as CalendarView[]).map((option) => (
            <button key={option} type="button" onClick={() => onViewChange(option)} className={`rounded-lg px-3 py-1.5 text-xs transition ${view === option ? "bg-cyberBlue/12 text-cyberBlue" : "text-mist hover:text-frost"}`}>
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <WorkspaceInput label="Title" value={draft.title} onChange={(value) => onDraftChange({ ...draft, title: value })} />
        <WorkspaceSelect label="Platform" value={draft.platform} options={platforms} onChange={(value) => onDraftChange({ ...draft, platform: value })} />
        <WorkspaceInput label="Publish Date" type="date" value={draft.publishDate} onChange={(value) => onDraftChange({ ...draft, publishDate: value })} />
        <WorkspaceSelect label="Status" value={draft.status} options={statuses} onChange={(value) => onDraftChange({ ...draft, status: value as CalendarStatus })} />
      </div>
      <div className="mt-4 space-y-2">
        {[draft, ...calendar].slice(0, view === "List" ? 4 : 3).map((item, index) => (
          <div key={`calendar-${item.title}-${index}`} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink/35 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-frost">{item.title || "Untitled content"}</p>
              <p className="mt-1 text-xs text-mist">{item.platform} / {item.publishDate}</p>
            </div>
            <span className="w-fit rounded-full border border-violetGlow/20 bg-violetGlow/10 px-3 py-1 text-[11px] text-violetGlow">{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ score }: { score: WorkspaceExportData["score"] }) {
  const rows = [
    ["Hook", score.hook],
    ["Retention", score.retention],
    ["Visual Strength", score.visualStrength],
    ["CTA Quality", score.ctaQuality],
  ] as const;
  return (
    <div className="rounded-3xl border border-cyberBlue/15 bg-cyberBlue/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">AI Content Score</p>
      <div className="mt-4 flex items-end gap-4">
        <p className="text-5xl font-semibold text-frost">{score.overall}</p>
        <p className="pb-2 text-sm text-mist">overall readiness</p>
      </div>
      <div className="mt-5 space-y-3">
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

function LibraryCard({ query, category, sort, items, onQueryChange, onCategoryChange, onSortChange }: {
  query: string;
  category: LibraryCategory | "All";
  sort: "Recent" | "Category";
  items: WorkspaceExportData["library"];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: LibraryCategory | "All") => void;
  onSortChange: (value: "Recent" | "Category") => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Content Library</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <WorkspaceInput label="Search" value={query} onChange={onQueryChange} />
        <WorkspaceSelect label="Filter" value={category} options={libraryFilters} onChange={(value) => onCategoryChange(value as LibraryCategory | "All")} />
        <WorkspaceSelect label="Sort" value={sort} options={librarySorts} onChange={(value) => onSortChange(value as "Recent" | "Category")} />
      </div>
      <div className="mt-4 max-h-[22rem] space-y-2.5 overflow-y-auto pr-1">
        {items.length ? items.map((item, index) => (
          <article key={`${item.category}-${item.title}-${index}`} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-frost">{item.title}</p>
              <span className="shrink-0 rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-2.5 py-1 text-[10px] text-cyberBlue">{item.category}</span>
            </div>
            <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-mist">{item.detail}</p>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">Generated scripts, storyboards, voiceovers, thumbnails, and videos appear here.</p>
        )}
      </div>
    </div>
  );
}

function AnalyticsCard({ analytics }: { analytics: WorkspaceExportData["analytics"] }) {
  const max = Math.max(1, ...Object.values(analytics));
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Analytics Dashboard</p>
      <div className="mt-5 space-y-4">
        {[
          ["Projects Created", analytics.projectsCreated],
          ["Videos Generated", analytics.videosGenerated],
          ["Voice Assets", analytics.voiceAssets],
          ["Thumbnail Assets", analytics.thumbnailAssets],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-xs text-mist"><span>{label}</span><span>{value}</span></div>
            <div className="h-8 overflow-hidden rounded-xl border border-white/10 bg-ink/35">
              <div className="h-full rounded-xl bg-gradient-to-r from-cyberBlue/50 to-violetGlow/45" style={{ width: `${(Number(value) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardCard({ projects, draggedProjectId, onDragStart, onDrop }: {
  projects: Array<Project & { boardStatus: BoardColumn }>;
  draggedProjectId: string | null;
  onDragStart: (id: string | null) => void;
  onDrop: (column: BoardColumn) => void;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Project Status Board</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {boardColumns.map((column) => (
          <div key={column} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(column)} className="min-h-36 rounded-2xl border border-white/10 bg-ink/35 p-3">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium text-frost">{column}</p><span className="text-xs text-mist">{projects.filter((item) => item.boardStatus === column).length}</span></div>
            <div className="space-y-2">
              {projects.filter((item) => item.boardStatus === column).map((item) => (
                <div key={`${column}-${item.id}`} draggable onDragStart={() => onDragStart(item.id)} onDragEnd={() => onDragStart(null)} className={`cursor-grab rounded-xl border p-3 text-sm text-frost transition ${draggedProjectId === item.id ? "border-cyberBlue/40 bg-cyberBlue/10" : "border-white/10 bg-white/[0.04]"}`}>
                  <p className="line-clamp-2">{item.title}</p>
                  <p className="mt-1 text-xs text-mist">{item.niche}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublishDestinations() {
  return (
    <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Publish Destinations</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {destinations.map((destination) => (
          <div key={destination} className="rounded-2xl border border-white/10 bg-ink/35 p-4 transition hover:border-cyberBlue/25 hover:bg-cyberBlue/[0.05]">
            <p className="text-base font-semibold text-frost">{destination}</p>
            <p className="mt-2 text-xs leading-5 text-mist">Mock integration / API-ready</p>
            <span className="mt-4 inline-flex rounded-full border border-[#FBBF24]/20 bg-[#FBBF24]/10 px-3 py-1 text-[11px] text-[#FDE68A]">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none" />
    </label>
  );
}

function WorkspaceSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none">
        {options.map((option) => <option key={`${label}-${option}`} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
