"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { downloadZipPackage, type ReelExportPackage } from "@/lib/export-package";
import type { ImageProvider, ReelProject as Project } from "@/lib/reel-projects";
import { createClient } from "@/lib/supabase/client";
import type { VideoAsset } from "@/components/workspace/video-studio-panel";

type Platform = "YouTube" | "Instagram" | "TikTok" | "Facebook";
type AccountStatus = "Connected" | "Not Connected" | "Expired";
type PublishStatus = "Draft" | "Scheduled" | "Publishing" | "Published" | "Failed" | "Manual Publish Ready";

type ThumbnailAsset = {
  id: string;
  provider: ImageProvider | "failed";
  image_url: string | null;
};

export type PublishingExportData = {
  accounts: Array<{ platform: Platform; status: AccountStatus }>;
  jobs: Array<{
    platform: Platform;
    title: string;
    status: PublishStatus;
    scheduledFor: string | null;
    timezone: string;
  }>;
  analyticsPreview: {
    views: number;
    ctr: string;
    watchTime: string;
    retention: string;
    engagement: string;
  };
  suggestions: {
    hookScore: number;
    thumbnailScore: number;
    ctaScore: number;
    improvements: string[];
  };
};

type PublishJob = {
  id: string;
  platform: Platform;
  title: string;
  description: string;
  hashtags: string;
  status: PublishStatus;
  scheduled_for: string | null;
  timezone: string;
  created_at: string;
};

type ConnectedAccount = {
  platform: Platform;
  status: AccountStatus;
  account_name: string | null;
  expires_at: string | null;
};

type PublishingStudioPanelProps = {
  userId?: string;
  project: Project | null;
  thumbnailAssets: ThumbnailAsset[];
  videoAssets: VideoAsset[];
  onNotify: (title: string, tone: "success" | "error" | "info", description?: string) => void;
  onPublishingChange?: (data: PublishingExportData) => void;
};

const platforms: Platform[] = ["YouTube", "Instagram", "TikTok", "Facebook"];
const queueStatuses: PublishStatus[] = ["Draft", "Scheduled", "Publishing", "Published", "Failed", "Manual Publish Ready"];
const timezones = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function score(text: string, base: number) {
  return Math.min(96, base + Math.min(20, Math.floor(text.trim().length / 80)));
}

function defaultAccounts(): ConnectedAccount[] {
  return platforms.map((platform) => ({
    platform,
    status: "Not Connected",
    account_name: null,
    expires_at: null,
  }));
}

export function getPublishingExportData(project: Project | null, jobs: PublishJob[] = [], accounts = defaultAccounts()): PublishingExportData {
  return {
    accounts: accounts.map((account) => ({ platform: account.platform, status: account.status })),
    jobs: jobs.map((job) => ({
      platform: job.platform,
      title: job.title,
      status: job.status,
      scheduledFor: job.scheduled_for,
      timezone: job.timezone,
    })),
    analyticsPreview: {
      views: project ? 12840 : 0,
      ctr: project?.thumbnailUrl ? "7.8%" : "4.2%",
      watchTime: project ? "18.4s" : "0s",
      retention: project?.outputs.storyboard ? "71%" : "44%",
      engagement: project?.outputs.cta ? "9.6%" : "3.1%",
    },
    suggestions: {
      hookScore: score(project?.outputs.hook ?? "", 62),
      thumbnailScore: project?.thumbnailUrl ? 84 : 58,
      ctaScore: score(project?.outputs.cta ?? "", 57),
      improvements: [
        project?.thumbnailUrl ? "Test a higher contrast thumbnail variant." : "Generate a thumbnail before scheduling.",
        "Put the strongest promise in the first 6 words of the title.",
        "Cross-post within 20 minutes for stronger launch momentum.",
      ],
    },
  };
}

export function PublishingStudioPanel({
  userId,
  project,
  thumbnailAssets,
  videoAssets,
  onNotify,
  onPublishingChange,
}: PublishingStudioPanelProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(() => defaultAccounts());
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["Instagram"]);
  const [form, setForm] = useState({
    title: project?.title ?? "",
    description: project?.outputs.caption ?? "",
    hashtags: "#reels #creator #ai",
    platform: "Instagram" as Platform,
    thumbnail: thumbnailAssets[0]?.image_url ?? project?.thumbnailUrl ?? "",
    video: videoAssets[0]?.video_url ?? videoAssets[0]?.thumbnail_url ?? "",
    scheduleDate: tomorrowDate(),
    scheduleTime: "18:00",
    timezone: "Asia/Kolkata",
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      title: current.title || project?.title || "",
      description: current.description || project?.outputs.caption || "",
      thumbnail: current.thumbnail || thumbnailAssets[0]?.image_url || project?.thumbnailUrl || "",
      video: current.video || videoAssets[0]?.video_url || videoAssets[0]?.thumbnail_url || "",
    }));
  }, [project, thumbnailAssets, videoAssets]);

  useEffect(() => {
    onPublishingChange?.(getPublishingExportData(project, jobs, accounts));
  }, [accounts, jobs, onPublishingChange, project]);

  useEffect(() => {
    if (!userId) {
      setAccounts(defaultAccounts());
      return;
    }

    let mounted = true;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("publishing_accounts")
        .select("platform,status,account_name,expires_at")
        .eq("user_id", userId);
      if (!mounted || !data) return;
      const rows = data as ConnectedAccount[];
      setAccounts(
        defaultAccounts().map((account) => {
          const saved = rows.find((row) => row.platform === account.platform);
          if (!saved) return account;
          const expired = saved.expires_at && Date.parse(saved.expires_at) < Date.now();
          return { ...saved, status: expired ? "Expired" : saved.status };
        }),
      );
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !project || project.id.startsWith("pending-")) {
      setJobs([]);
      return;
    }

    let mounted = true;
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("publishing_jobs")
        .select("id,platform,title,description,hashtags,status,scheduled_for,timezone,created_at")
        .eq("user_id", userId)
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!mounted) return;
      if (!error && data) {
        setJobs(data as PublishJob[]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [project, userId]);

  const exportData = useMemo(() => getPublishingExportData(project, jobs, accounts), [accounts, jobs, project]);

  const thumbnailOptions = useMemo(
    () => [
      ...(project?.thumbnailUrl ? [{ value: project.thumbnailUrl, label: "Project thumbnail" }] : []),
      ...thumbnailAssets
        .filter((asset) => asset.image_url)
        .map((asset, index) => ({ value: asset.image_url ?? "", label: `Thumbnail ${index + 1} / ${asset.provider}` })),
    ],
    [project?.thumbnailUrl, thumbnailAssets],
  );

  const videoOptions = useMemo(
    () =>
      videoAssets.map((asset, index) => ({
        value: asset.video_url ?? asset.thumbnail_url ?? "",
        label: `Video ${index + 1} / ${asset.provider} / ${asset.status}`,
      })),
    [videoAssets],
  );

  const exportPackage = useMemo<ReelExportPackage | null>(() => {
    if (!project) return null;
    return {
      title: project.title,
      prompt: project.prompt,
      niche: project.niche,
      language: project.language,
      duration: project.duration,
      tone: project.tone,
      generationModel: project.generationModel,
      status: project.status,
      createdAt: project.createdAt,
      thumbnailUrl: form.thumbnail || project.thumbnailUrl,
      outputs: project.outputs,
      videoAsset: videoAssets[0]
        ? {
            provider: videoAssets[0].provider,
            video_url: videoAssets[0].video_url,
            thumbnail_url: videoAssets[0].thumbnail_url,
            resolution: videoAssets[0].resolution,
            aspect_ratio: videoAssets[0].aspect_ratio,
            quality: videoAssets[0].quality,
            duration_seconds: videoAssets[0].duration_seconds,
            generation_ms: videoAssets[0].generation_ms,
            status: videoAssets[0].status,
            error_message: videoAssets[0].error_message,
            created_at: videoAssets[0].created_at,
          }
        : null,
      publishing: exportData,
    };
  }, [exportData, form.thumbnail, project, videoAssets]);

  const createJobs = useCallback(
    async (status: PublishStatus) => {
      if (!project) {
        onNotify("No project selected", "error", "Generate or reopen a project before publishing.");
        return;
      }

      const scheduledFor = `${form.scheduleDate}T${form.scheduleTime}:00`;
      const createdJobs: PublishJob[] = selectedPlatforms.map((platform) => ({
        id: `local-${platform}-${Date.now()}`,
        platform,
        title: form.title || project.title,
        description: form.description,
        hashtags: form.hashtags,
        status,
        scheduled_for: status === "Draft" ? null : scheduledFor,
        timezone: form.timezone,
        created_at: new Date().toISOString(),
      }));

      setJobs((current) => [...createdJobs, ...current].slice(0, 10));

      if (status === "Publishing") {
        const publishedJobs = await Promise.all(
          createdJobs.map(async (job) => {
            try {
              const response = await fetch("/api/publishing/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  platform: job.platform,
                  projectId: project.id,
                  title: job.title,
                  description: job.description,
                  hashtags: job.hashtags,
                  thumbnailUrl: form.thumbnail || null,
                  videoUrl: form.video || null,
                  scheduledFor: job.scheduled_for,
                  timezone: job.timezone,
                }),
              });
              const payload = (await response.json()) as { status?: unknown; jobId?: unknown; error?: unknown; message?: unknown; manualMode?: unknown };
              if (!response.ok || (payload.status !== "Published" && payload.status !== "Manual Publish Ready")) {
                throw new Error(typeof payload.error === "string" ? payload.error : "Publishing failed.");
              }
              return {
                ...job,
                id: typeof payload.jobId === "string" ? payload.jobId : job.id,
                status: payload.status as PublishStatus,
              };
            } catch (error) {
              const message = error instanceof Error ? error.message : "Publishing failed.";
              onNotify("Publishing failed", "error", message);
              return { ...job, status: "Failed" as PublishStatus };
            }
          }),
        );
        setJobs((current) => [...publishedJobs, ...current.filter((job) => !job.id.startsWith("local-"))].slice(0, 10));
        const failedCount = publishedJobs.filter((job) => job.status === "Failed").length;
        const manualCount = publishedJobs.filter((job) => job.status === "Manual Publish Ready").length;
        onNotify(
          failedCount ? "Some platforms failed" : manualCount ? "Manual Publish Ready" : "Published",
          failedCount ? "error" : "success",
          failedCount
            ? `${failedCount} publish job${failedCount === 1 ? "" : "s"} failed.`
            : manualCount
              ? `${manualCount} package${manualCount === 1 ? "" : "s"} prepared for manual publishing.`
              : "OAuth-connected publish jobs completed.",
        );
        return;
      }

      if (status === "Scheduled") {
        const scheduledJobs = await Promise.all(
          createdJobs.map(async (job) => {
            try {
              const response = await fetch("/api/publishing/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  platform: job.platform,
                  projectId: project.id,
                  title: job.title,
                  description: job.description,
                  hashtags: job.hashtags,
                  thumbnailUrl: form.thumbnail || null,
                  videoUrl: form.video || null,
                  scheduledFor: job.scheduled_for,
                  timezone: job.timezone,
                }),
              });
              const payload = (await response.json()) as { status?: unknown; jobId?: unknown; error?: unknown };
              if (!response.ok || payload.status !== "Scheduled") {
                throw new Error(typeof payload.error === "string" ? payload.error : "Scheduling failed.");
              }
              return { ...job, id: typeof payload.jobId === "string" ? payload.jobId : job.id };
            } catch (error) {
              const message = error instanceof Error ? error.message : "Scheduling failed.";
              onNotify("Schedule failed", "error", message);
              return { ...job, status: "Failed" as PublishStatus };
            }
          }),
        );
        setJobs((current) => [...scheduledJobs, ...current.filter((job) => !job.id.startsWith("local-"))].slice(0, 10));
        onNotify("Schedule queue updated", "success", `${selectedPlatforms.length} platform job${selectedPlatforms.length === 1 ? "" : "s"} prepared.`);
        return;
      }

      if (userId && !project.id.startsWith("pending-")) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("publishing_jobs")
          .insert(
            createdJobs.map((job) => ({
              user_id: userId,
              project_id: project.id,
              platform: job.platform,
              title: job.title,
              description: job.description,
              hashtags: job.hashtags,
              status: job.status,
              scheduled_for: job.scheduled_for,
              timezone: job.timezone,
              thumbnail_url: form.thumbnail || null,
              video_url: form.video || null,
            })),
          )
          .select("id,platform,title,description,hashtags,status,scheduled_for,timezone,created_at");

        if (!error && data) {
          const savedJobs = data as PublishJob[];
          setJobs((current) => [...savedJobs, ...current.filter((job) => !job.id.startsWith("local-"))].slice(0, 10));
          await supabase.from("publish_events").insert(
            savedJobs.map((job) => ({
              user_id: userId,
              project_id: project.id,
              publishing_job_id: job.id,
              event_type: status.toLowerCase(),
              detail: `${job.platform} job ${status.toLowerCase()}`,
            })),
          );
        }
      }

      onNotify(status === "Draft" ? "Draft saved" : "Publish queue updated", "success", `${selectedPlatforms.length} platform job${selectedPlatforms.length === 1 ? "" : "s"} prepared.`);
    },
    [form, onNotify, project, selectedPlatforms, userId],
  );

  const connectAccount = useCallback((platform: Platform) => {
    window.location.href = `/api/publishing/connect?platform=${encodeURIComponent(platform)}`;
  }, []);

  const disconnectAccount = useCallback(
    async (platform: Platform) => {
      const response = await fetch("/api/publishing/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!response.ok) {
        onNotify("Disconnect failed", "error", "Unable to update this connected account.");
        return;
      }
      setAccounts((current) =>
        current.map((account) =>
          account.platform === platform
            ? { ...account, status: "Not Connected", account_name: null, expires_at: null }
            : account,
        ),
      );
      onNotify("Account disconnected", "success", `${platform} is no longer connected.`);
    },
    [onNotify],
  );

  const copyCaption = useCallback(async () => {
    await navigator.clipboard.writeText(form.description);
    onNotify("Caption copied", "success", "Caption is ready for manual publishing.");
  }, [form.description, onNotify]);

  const copyHashtags = useCallback(async () => {
    await navigator.clipboard.writeText(form.hashtags);
    onNotify("Hashtags copied", "success", "Hashtags are ready for manual publishing.");
  }, [form.hashtags, onNotify]);

  const downloadVideo = useCallback(() => {
    if (!form.video) {
      onNotify("No video selected", "error", "Generate or paste a video URL before downloading.");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = form.video;
    anchor.download = `${project?.title ?? "reelmind-video"}.mp4`;
    anchor.rel = "noreferrer";
    anchor.click();
    onNotify("MP4 download started", "success", "Your video is ready for manual publishing.");
  }, [form.video, onNotify, project?.title]);

  const exportManualPackage = useCallback(async () => {
    if (!project || !exportPackage) {
      onNotify("No project selected", "error", "Generate or reopen a project before exporting.");
      return;
    }

    const response = await fetch("/api/publishing/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "manual_export",
        platform: form.platform,
        projectId: project.id,
        title: form.title || project.title,
        description: form.description,
        hashtags: form.hashtags,
        thumbnailUrl: form.thumbnail || null,
        videoUrl: form.video || null,
        timezone: form.timezone,
      }),
    });
    const payload = (await response.json()) as { error?: unknown };
    if (!response.ok) {
      onNotify("Manual export failed", "error", typeof payload.error === "string" ? payload.error : "Unable to record manual export.");
      return;
    }

    await downloadZipPackage(exportPackage);
    onNotify("Manual Publish Ready", "success", "ZIP exported and history recorded.");
  }, [exportPackage, form, onNotify, project]);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Publishing Studio</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Cross-post command center</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Prepare platform-ready posts, schedule releases, and track AI publishing readiness from one cinematic hub.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void createJobs("Publishing")}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost"
        >
          Publish Now
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {accounts.map((account) => (
          <article
            key={account.platform}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-cyberBlue/25 hover:bg-cyberBlue/[0.05]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-frost">{account.platform}</p>
              <StatusPill status={account.status} />
            </div>
            <p className="mt-3 text-xs leading-5 text-mist">
              {account.account_name ?? "OAuth account"}{account.expires_at ? ` / expires ${new Date(account.expires_at).toLocaleDateString()}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => connectAccount(account.platform)}
                className="rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-3 py-1.5 text-xs font-medium text-cyberBlue transition hover:text-frost"
              >
                {account.status === "Expired" ? "Reconnect" : "Connect"}
              </button>
              {account.status === "Connected" ? (
                <button
                  type="button"
                  onClick={() => void disconnectAccount(account.platform)}
                  className="rounded-full border border-[#FB7185]/25 bg-[#FB7185]/10 px-3 py-1.5 text-xs font-medium text-[#FDA4AF] transition hover:text-frost"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Publishing Form</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PublishInput label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
            <PublishSelect label="Platform" value={form.platform} options={platforms} onChange={(value) => setForm((current) => ({ ...current, platform: value as Platform }))} />
            <label className="block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist sm:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="workspace-input mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm normal-case tracking-normal text-frost outline-none"
              />
            </label>
            <PublishInput label="Hashtags" value={form.hashtags} onChange={(value) => setForm((current) => ({ ...current, hashtags: value }))} />
            <PublishSelect label="Thumbnail" value={form.thumbnail} options={thumbnailOptions.length ? thumbnailOptions : [{ value: "", label: "No thumbnail selected" }]} onChange={(value) => setForm((current) => ({ ...current, thumbnail: value }))} />
            <PublishSelect label="Video" value={form.video} options={videoOptions.length ? videoOptions : [{ value: "", label: "No video selected" }]} onChange={(value) => setForm((current) => ({ ...current, video: value }))} />
            <PublishInput label="Schedule Date" type="date" value={form.scheduleDate} onChange={(value) => setForm((current) => ({ ...current, scheduleDate: value }))} />
            <PublishInput label="Schedule Time" type="time" value={form.scheduleTime} onChange={(value) => setForm((current) => ({ ...current, scheduleTime: value }))} />
            <PublishSelect label="Timezone" value={form.timezone} options={timezones} onChange={(value) => setForm((current) => ({ ...current, timezone: value }))} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PreviewCard title="Thumbnail Preview" url={form.thumbnail} type="image" />
            <PreviewCard title="Video Preview" url={form.video} type="video" />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-ink/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mist">Cross-post platforms</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <label key={`crosspost-${platform}`} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-frost">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform)}
                    onChange={(event) =>
                      setSelectedPlatforms((current) =>
                        event.target.checked
                          ? [...new Set([...current, platform])]
                          : current.filter((item) => item !== platform),
                      )
                    }
                    className="accent-cyberBlue"
                  />
                  {platform}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => void createJobs("Draft")} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-frost transition hover:border-violetGlow/30 hover:text-violetGlow">
              Save Draft
            </button>
            <button type="button" onClick={() => void createJobs("Scheduled")} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-4 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost">
              Queue Cross-post
            </button>
            <button type="button" onClick={() => void createJobs("Publishing")} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-violetGlow/30 bg-violetGlow/10 px-4 text-sm font-medium text-violetGlow transition hover:border-violetGlow/50 hover:text-frost">
              Publish Now
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-[#FBBF24]/20 bg-[#FBBF24]/[0.07] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FDE68A]">Export mode</p>
                <p className="mt-1 text-xs leading-5 text-mist">Use this when platform API credentials are missing or manual upload is preferred.</p>
              </div>
              <span className="w-fit rounded-full border border-[#FBBF24]/25 bg-[#FBBF24]/10 px-3 py-1 text-[11px] font-semibold text-[#FDE68A]">
                Manual Publish Ready
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={downloadVideo} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-frost transition hover:border-cyberBlue/30 hover:text-cyberBlue">
                Download MP4
              </button>
              <button type="button" onClick={() => void copyCaption()} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-frost transition hover:border-cyberBlue/30 hover:text-cyberBlue">
                Copy Caption
              </button>
              <button type="button" onClick={() => void copyHashtags()} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-frost transition hover:border-cyberBlue/30 hover:text-cyberBlue">
                Copy Hashtags
              </button>
              <button type="button" onClick={() => void exportManualPackage()} className="rounded-full border border-[#FBBF24]/25 bg-[#FBBF24]/10 px-4 py-2 text-xs font-medium text-[#FDE68A] transition hover:text-frost">
                Export Package ZIP
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <QueueCard jobs={jobs} />
          <AnalyticsPreview data={exportData.analyticsPreview} />
          <Suggestions data={exportData.suggestions} />
        </div>
      </div>
    </section>
  );
}

function QueueCard({ jobs }: { jobs: PublishJob[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Publish Queue</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {queueStatuses.map((status) => (
          <span key={status} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-mist">
            {status}: {jobs.filter((job) => job.status === status).length}
          </span>
        ))}
      </div>
      <div className="mt-4 max-h-56 space-y-2.5 overflow-y-auto pr-1">
        {jobs.length ? jobs.map((job) => (
          <article key={job.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-frost">{job.title}</p>
              <StatusPill status={job.status} />
            </div>
            <p className="mt-1 text-xs text-mist">{job.platform} / {job.scheduled_for ? new Date(job.scheduled_for).toLocaleString() : "Draft"}</p>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-mist">Drafts and scheduled jobs will appear here.</p>
        )}
      </div>
    </div>
  );
}

function AnalyticsPreview({ data }: { data: PublishingExportData["analyticsPreview"] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Analytics Preview</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ["Views", data.views.toLocaleString()],
          ["CTR", data.ctr],
          ["Watch Time", data.watchTime],
          ["Retention", data.retention],
          ["Engagement", data.engagement],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-ink/35 p-3">
            <p className="text-lg font-semibold text-frost">{value}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Suggestions({ data }: { data: PublishingExportData["suggestions"] }) {
  return (
    <div className="rounded-3xl border border-cyberBlue/15 bg-cyberBlue/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">AI Optimization</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Score label="Hook" value={data.hookScore} />
        <Score label="Thumb" value={data.thumbnailScore} />
        <Score label="CTA" value={data.ctaScore} />
      </div>
      <div className="mt-4 space-y-2">
        {data.improvements.map((item, index) => (
          <p key={`suggestion-${index}`} className="rounded-xl border border-white/10 bg-ink/35 p-3 text-xs leading-5 text-mist">{item}</p>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ title, url, type }: { title: string; url: string; type: "image" | "video" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink/35">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">{title}</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-mist">
          {url ? "Ready" : "Missing"}
        </span>
      </div>
      <div className="aspect-video bg-white/[0.03]">
        {url && type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="h-full w-full object-cover" />
        ) : url && type === "video" ? (
          <video src={url} controls className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs leading-5 text-mist">
            Select or generate an asset to preview it here.
          </div>
        )}
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink/35 p-3">
      <p className="text-lg font-semibold text-frost">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: AccountStatus | PublishStatus }) {
  const good = status === "Connected" || status === "Published" || status === "Scheduled";
  const bad = status === "Expired" || status === "Failed";
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
      good
        ? "border-[#34D399]/25 bg-[#34D399]/10 text-[#6EE7B7]"
        : bad
          ? "border-[#FB7185]/25 bg-[#FB7185]/10 text-[#FDA4AF]"
          : "border-[#FBBF24]/25 bg-[#FBBF24]/10 text-[#FDE68A]"
    }`}>
      {status}
    </span>
  );
}

function PublishInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none" />
    </label>
  );
}

function PublishSelect({ label, value, options, onChange }: { label: string; value: string; options: string[] | Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none">
        {options.map((option) => {
          const normalized = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={`${label}-${normalized.value}`} value={normalized.value}>{normalized.label}</option>;
        })}
      </select>
    </label>
  );
}
