export type ReadinessStatus = "ready" | "warning" | "blocked";
export type ReadinessCheck = { id: string; category: string; name: string; status: ReadinessStatus; weight: number; points: number; summary: string; details: string[]; missing: string[]; action: string | null };
export type LaunchReadiness = { score: number; verdict: "production_ready" | "conditional" | "blocked"; generatedAt: string; checks: ReadinessCheck[]; missingConfiguration: string[]; summary: { ready: number; warning: number; blocked: number; total: number }; services: Record<string, ReadinessStatus> };
export type LaunchReport = { id: string; score: number; verdict: LaunchReadiness["verdict"]; generated_at: string; generated_by: string | null; missing_configuration: string[] };
