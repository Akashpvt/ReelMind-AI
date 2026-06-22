import { getPlanLabel, getPlanLimit } from "@/lib/payments/razorpay-plans";

export const creditCosts = {
  thumbnail: 1,
  storyboard: 1,
  voiceover: 1,
  production_pack: 2,
  video_generation: 5,
  publishing_export: 2,
  publish_now: 2,
  schedule_post: 1,
  export_package: 1,
} as const;

export type CreditAction = keyof typeof creditCosts;

export function isCreditAction(value: unknown): value is CreditAction {
  return typeof value === "string" && value in creditCosts;
}

export function planLimit(planName: string) {
  return getPlanLimit(planName);
}

export function planLabel(planName: string) {
  return getPlanLabel(planName);
}
