import type { GeneratedOutputs } from "@/lib/reel-generation";

export const reelProjectColumns =
  "id,user_id,title,category,niche,tone,language,duration,prompt,viral_hook,reel_script,caption,cta,video_prompt,thumbnail_prompt,storyboard,voiceover,production_pack,thumbnail_url,image_provider,generation_time_ms,generation_model,status,export_count,created_at,updated_at";
export const reelProjectColumnsWithoutProviderMetadata =
  "id,user_id,title,category,niche,tone,language,duration,prompt,viral_hook,reel_script,caption,cta,video_prompt,thumbnail_prompt,storyboard,voiceover,production_pack,thumbnail_url,generation_model,status,export_count,created_at,updated_at";
export const fallbackReelProjectColumns =
  "id,user_id,title,niche,tone,language,duration,prompt,viral_hook,reel_script,caption,cta,video_prompt,thumbnail_prompt,created_at";
export const projectOrderColumns = {
  updated: "updated_at",
  created: "created_at",
} as const;

export type ProjectStatus = "draft" | "generated" | "archived";
export type ImageProvider = "gemini" | "pollinations" | "placeholder";

export type ReelProjectRow = {
  id: string;
  user_id: string;
  title: string;
  category?: string;
  niche: string;
  tone: string;
  language: string;
  duration: string;
  prompt: string;
  viral_hook: string;
  reel_script: string;
  caption: string;
  cta: string;
  video_prompt: string;
  thumbnail_prompt: string;
  storyboard?: string | null;
  voiceover?: string | null;
  production_pack?: string | null;
  thumbnail_url?: string | null;
  image_provider?: ImageProvider | null;
  generation_time_ms?: number | null;
  generation_model?: string;
  status?: ProjectStatus;
  export_count?: number;
  created_at: string;
  updated_at?: string;
};

export type ReelProject = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  niche: string;
  language: string;
  duration: string;
  tone: string;
  generationModel: string;
  status: ProjectStatus;
  thumbnailUrl: string | null;
  imageProvider: ImageProvider | null;
  generationTimeMs: number | null;
  exportCount: number;
  createdAt: string;
  updatedAt: string;
  outputs: GeneratedOutputs;
};

export type ReelProjectInsert = Omit<ReelProjectRow, "id" | "created_at" | "updated_at" | "export_count">;

export type GenerationHistoryRow = {
  id: string;
  project_id: string;
  user_id: string;
  event_type: "generation" | "thumbnail" | "regeneration";
  snapshot: ReelProjectRow | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  action: "generated" | "saved" | "exported" | "image_generated" | "video_generated" | "renamed";
  detail: string | null;
  created_at: string;
};

export function isReelProjectRow(value: unknown): value is ReelProjectRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.user_id === "string" &&
    typeof row.title === "string" &&
    typeof row.niche === "string" &&
    typeof row.tone === "string" &&
    typeof row.language === "string" &&
    typeof row.duration === "string" &&
    typeof row.prompt === "string" &&
    typeof row.viral_hook === "string" &&
    typeof row.reel_script === "string" &&
    typeof row.caption === "string" &&
    typeof row.cta === "string" &&
    typeof row.video_prompt === "string" &&
    typeof row.thumbnail_prompt === "string" &&
    typeof row.created_at === "string"
  );
}

export function createProjectTitle(prompt: string) {
  const title = prompt
    .split("--- Creative direction ---")[0]
    .trim()
    .split("\n")
    .find((line) => line.trim().length > 0);

  return (title ?? "New reel concept").slice(0, 90);
}

export function toProjectInsert(project: ReelProject, userId: string): ReelProjectInsert {
  return {
    user_id: userId,
    title: project.title,
    category: project.category,
    niche: project.niche,
    tone: project.tone,
    language: project.language,
    duration: project.duration,
    prompt: project.prompt,
    viral_hook: project.outputs.hook,
    reel_script: project.outputs.script,
    caption: project.outputs.caption,
    cta: project.outputs.cta,
    video_prompt: project.outputs.videoPrompt,
    thumbnail_prompt: project.outputs.thumbnailPrompt,
    storyboard: project.outputs.storyboard,
    voiceover: project.outputs.voiceover,
    production_pack: project.outputs.productionPack,
    thumbnail_url: project.thumbnailUrl,
    image_provider: project.imageProvider,
    generation_time_ms: project.generationTimeMs,
    generation_model: project.generationModel,
    status: project.status,
  };
}

export function fromProjectRow(row: ReelProjectRow): ReelProject {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? row.niche,
    prompt: row.prompt,
    niche: row.niche,
    language: row.language,
    duration: row.duration,
    tone: row.tone,
    generationModel: row.generation_model ?? "gemini-2.5-flash",
    status: row.status ?? "generated",
    thumbnailUrl: row.thumbnail_url ?? null,
    imageProvider: row.image_provider ?? null,
    generationTimeMs: row.generation_time_ms ?? null,
    exportCount: row.export_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    outputs: {
      hook: row.viral_hook,
      script: row.reel_script,
      caption: row.caption,
      cta: row.cta,
      videoPrompt: row.video_prompt,
      thumbnailPrompt: row.thumbnail_prompt,
      storyboard: row.storyboard ?? "[]",
      voiceover: row.voiceover ?? "{}",
      productionPack: row.production_pack ?? "{}",
    },
  };
}
