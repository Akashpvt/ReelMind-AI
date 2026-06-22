import type { ProviderId } from "@/lib/providers/provider-types";

export const contentGenerationTypes = ["script", "hook", "caption", "hashtags", "thumbnail_concepts", "content_calendar", "brand_analysis", "strategy_report"] as const;
export type ContentGenerationType = (typeof contentGenerationTypes)[number];
export type ContentProvider = Extract<ProviderId, "openai" | "gemini" | "claude"> | "auto";

export type ContentGenerationInput = {
  type: ContentGenerationType;
  provider: ContentProvider;
  topic: string;
  brand: string;
  audience: string;
  tone: string;
  platform: string;
  objective: string;
  clientName?: string;
  startDate?: string;
  days?: number;
};

export type CalendarEntry = {
  date: string;
  platform: string;
  format: string;
  theme: string;
  hook: string;
  cta: string;
};

export type ContentOutput = {
  title: string;
  summary: string;
  sections: Array<{ heading: string; content: string }>;
  hashtags?: string[];
  calendar?: CalendarEntry[];
};
