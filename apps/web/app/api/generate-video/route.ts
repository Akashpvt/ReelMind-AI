import { NextResponse } from "next/server";
import {
  normalizeVideoAspectRatio,
  normalizeVideoDuration,
  normalizeVideoProvider,
  normalizeVideoQuality,
  normalizeVideoResolution,
  type GenerateVideoPayload,
  type VideoProvider,
} from "@/lib/video-providers";
import { routeVideo } from "@/lib/tools";
import { serverEnv } from "@/lib/providers";
import { getVeoEndpoint } from "@/lib/providers/veo-client";
import { RUNWAY_VIDEO_ENDPOINT } from "@/lib/providers/runway-client";

export const runtime = "nodejs";

const debugVideo = process.env.DEBUG_VIDEO === "true" || process.env.DEBUG_TOOLS === "true" || process.env.NODE_ENV === "development";
const runwayThumbnailRequiredMessage = "Runway needs a thumbnail image URL. Generate thumbnail or paste manual image URL.";
const demoVideoUrl = "/demo/reelmind-demo.mp4";
const demoVideoMessage = "Demo video generated — provider credits required for real render";

function logVideo(scope: string, payload: unknown) {
  if (debugVideo) {
    console.info(`[video] ${scope}`, payload);
  }
}

function resolvePrimaryProvider(provider: VideoProvider) {
  return provider === "runway" ? "runway" : "veo";
}

function fallbackFor(provider: "veo" | "runway") {
  return provider === "veo" ? "runway" : "veo";
}

type VideoRouteResult = Awaited<ReturnType<typeof routeVideo>>;

function resultError(result: VideoRouteResult) {
  return result.output.error ?? `${result.provider} video generation failed.`;
}

function resultResponseBody(result: VideoRouteResult) {
  return result.output.responseBody ?? null;
}

function isVeoQuotaError(error: string | null) {
  return Boolean(error && /429|quota|rate limit|resource exhausted/i.test(error));
}

function isRunwayCreditError(error: string | null) {
  return Boolean(error && /not enough credits|insufficient credits|credit balance|credits required|payment required/i.test(error));
}

function demoFallbackEligible(veoError: string | null, runwayError: string | null) {
  return isVeoQuotaError(veoError) || isRunwayCreditError(runwayError);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    const productionPack = typeof body.productionPack === "string" ? body.productionPack : "";
    const thumbnailUrl = typeof body.thumbnailUrl === "string" ? body.thumbnailUrl.trim() : "";

    if (!projectId) {
      return NextResponse.json(
        { success: false, status: "failed", message: "Project id is required." },
        { status: 400 },
      );
    }

    const payload: GenerateVideoPayload = {
      projectId,
      provider: normalizeVideoProvider(body.provider),
      duration: normalizeVideoDuration(body.duration),
      resolution: normalizeVideoResolution(body.resolution),
      aspectRatio: normalizeVideoAspectRatio(body.aspectRatio),
      quality: normalizeVideoQuality(body.quality),
      productionPack,
    };

    const primary = resolvePrimaryProvider(payload.provider);
    const fallback = fallbackFor(primary);
    if (primary === "runway" && !thumbnailUrl) {
      return NextResponse.json({
        success: false,
        provider: "runway",
        status: "failed",
        error: runwayThumbnailRequiredMessage,
        message: runwayThumbnailRequiredMessage,
        responseBody: null,
        veoError: null,
        runwayError: runwayThumbnailRequiredMessage,
        fallbackAttempted: false,
        finalProvider: "runway",
        videoUrl: null,
        downloadUrl: null,
        thumbnailUrl: null,
        duration: payload.duration,
        generationMs: Date.now() - startedAt,
      });
    }

    const hasVeoKey = Boolean(process.env.VEO_API_KEY);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const hasEffectiveVeoKey = hasVeoKey || hasGeminiKey;
    const hasRunwayKey = Boolean(process.env.RUNWAY_API_KEY);
    const selectedProvider = primary;
    const veoEndpoint = getVeoEndpoint();
    const runwayEndpoint = RUNWAY_VIDEO_ENDPOINT;
    const env = {
      ...serverEnv(),
      VEO_API_KEY: process.env.VEO_API_KEY ?? process.env.GEMINI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      RUNWAY_API_KEY: process.env.RUNWAY_API_KEY,
    };

    logVideo("provider_selected", {
      hasVeoKey,
      hasGeminiKey,
      hasRunwayKey,
      selectedProvider,
      veoEndpoint,
      runwayEndpoint,
      requested: payload.provider,
      primary,
      fallback,
      primaryConnected: primary === "veo" ? hasEffectiveVeoKey : hasRunwayKey,
      fallbackConnected: fallback === "veo" ? hasEffectiveVeoKey : hasRunwayKey,
    });

    const routePayload = {
      prompt: productionPack || `Cinematic creator reel for ${payload.projectId}`,
      durationSeconds: payload.duration,
      aspectRatio: payload.aspectRatio,
      quality: payload.quality,
      style: `Resolution ${payload.resolution}, cinematic creator workflow`,
      thumbnailUrl: thumbnailUrl || undefined,
    };
    const routeOptions = {
      taskType: "video_asset_generation",
      agentType: "video" as const,
      env,
      strictProviders: true,
    };

    let result = await routeVideo(routePayload, {
      ...routeOptions,
      primary,
    });
    const veoError = primary === "veo" && typeof result.output.videoUrl !== "string" ? resultError(result) : null;
    let runwayError: string | null = primary === "runway" && typeof result.output.videoUrl !== "string" ? resultError(result) : null;
    let fallbackAttempted = false;

    if (typeof result.output.videoUrl !== "string" && fallback === "runway" && hasRunwayKey && !thumbnailUrl) {
      runwayError = runwayThumbnailRequiredMessage;
    }

    if (typeof result.output.videoUrl !== "string" && fallback === "runway" && hasRunwayKey && thumbnailUrl) {
      fallbackAttempted = true;
      logVideo("fallback_attempted", {
        from: primary,
        to: fallback,
        veoError,
        runwayEndpoint,
      });
      result = await routeVideo(routePayload, {
        ...routeOptions,
        primary: "runway",
      });
      runwayError = typeof result.output.videoUrl !== "string" ? resultError(result) : null;
    }

    logVideo("provider_result", {
      provider: result.provider,
      status: result.output.status,
      jobId: result.output.providerJobId,
      attemptedProviders: result.output.attemptedProviders,
      latency: result.latency,
      hasVideoUrl: Boolean(result.output.videoUrl),
      veoEndpoint,
      runwayEndpoint,
      fallbackAttempted,
      finalProvider: result.provider,
      veoError,
      runwayError,
    });

    if (typeof result.output.videoUrl !== "string") {
      const status = result.output.status === "missing_credentials" ? "not_configured" : "failed";
      const error = result.output.error ?? null;
      const message = result.output.error
        || (status === "not_configured"
          ? "Video provider not configured."
          : "Video generation could not be completed.");
      const responseBody = resultResponseBody(result);
      if (demoFallbackEligible(veoError, runwayError)) {
        logVideo("demo_fallback_selected", {
          veoError,
          runwayError,
          finalProvider: "demo",
        });
        return NextResponse.json({
          success: true,
          provider: "demo",
          status: "completed",
          error: null,
          message: demoVideoMessage,
          responseBody: {
            providerErrors: {
              veoError,
              runwayError,
              finalProviderError: error,
            },
            finalProviderResponseBody: responseBody,
          },
          veoError,
          runwayError,
          fallbackAttempted,
          finalProvider: "demo",
          jobId: `demo-${startedAt}`,
          videoUrl: demoVideoUrl,
          downloadUrl: demoVideoUrl,
          thumbnailUrl: thumbnailUrl || null,
          duration: payload.duration,
          generationMs: Date.now() - startedAt,
        });
      }

      return NextResponse.json({
        success: false,
        provider: result.provider,
        status,
        error,
        message,
        responseBody,
        veoError,
        runwayError,
        fallbackAttempted,
        finalProvider: result.provider,
        videoUrl: null,
        downloadUrl: null,
        thumbnailUrl: null,
        duration: payload.duration,
        generationMs: Date.now() - startedAt,
      });
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      status: "completed",
      error: null,
      message: "Video render completed.",
      responseBody: result.output.responseBody ?? result.output,
      veoError,
      runwayError,
      fallbackAttempted,
      finalProvider: result.provider,
      jobId: result.output.providerJobId ?? null,
      videoUrl: result.output.videoUrl,
      downloadUrl: result.output.downloadUrl ?? result.output.videoUrl,
      thumbnailUrl: result.output.thumbnailUrl ?? null,
      duration: typeof result.output.durationSeconds === "number" ? result.output.durationSeconds : payload.duration,
      generationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Video generation failed. Please try again.";
    logVideo("route_failed", error instanceof Error ? { message: error.message } : error);
    return NextResponse.json(
      {
        success: false,
        provider: "placeholder",
        status: "failed",
        error: errorMessage,
        message: errorMessage,
        responseBody: error instanceof Error ? { name: error.name, message: error.message } : error,
        videoUrl: null,
        downloadUrl: null,
        thumbnailUrl: null,
        duration: 0,
        generationMs: Date.now() - startedAt,
      },
      { status: 200 },
    );
  }
}
