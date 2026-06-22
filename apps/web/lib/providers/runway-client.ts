import { ProviderError } from "@/lib/providers/provider-errors";
import { assertVideoUrl, executeVideoRequest, pollVideoJob, safeVideoResponseBody, type VideoClientRequest, type VideoClientResponse, usageFromVideo, withTimeout } from "@/lib/providers/video-client-utils";

type RunwayCreateResponse = {
  id?: string;
  task_id?: string;
  status?: string;
  output?: { url?: string; thumbnail_url?: string };
};

export const RUNWAY_VIDEO_ENDPOINT =
  "https://api.dev.runwayml.com/v1/image_to_video";
const RUNWAY_API_VERSION = "2024-11-06";

function logRunwayError(runwayEndpoint: string, status: number, responseBody: string) {
  console.warn("[video] runway_error_response", {
    runwayEndpoint,
    status,
    responseBody: responseBody || "[empty response body]",
  });
}

function normalizeRunwayRatio(aspectRatio?: string) {
  if (aspectRatio === "16:9") return "1280:720";
  if (aspectRatio === "1:1") return "960:960";
  return "720:1280";
}

function normalizeRunwayDuration(durationSeconds?: number) {
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration)) return 5;
  return Math.min(10, Math.max(5, duration));
}

export async function generateVideo(request: VideoClientRequest): Promise<VideoClientResponse> {
  const startedAt = Date.now();
  const duration = normalizeRunwayDuration(request.durationSeconds);
  const ratio = normalizeRunwayRatio(request.aspectRatio);
  const model = request.model || "gen4_turbo";
  const apiKey = request.apiKey ?? "";
  const debugVideo = process.env.DEBUG_VIDEO === "true" || process.env.DEBUG_TOOLS === "true" || process.env.NODE_ENV === "development";

  return executeVideoRequest("runway", async () => {
    if (debugVideo) {
      console.info("[video] provider_selected", { provider: "runway", connected: Boolean(request.apiKey), duration, ratio });
    }
    console.info("[video] runway_request_payload", {
      model,
      ratio,
      duration,
      hasPromptImage: Boolean(request.promptImage),
      promptTextLength: request.prompt.length,
    });
    const createResponse = await withTimeout(
      fetch(RUNWAY_VIDEO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Runway-Version": RUNWAY_API_VERSION,
        },
        body: JSON.stringify({
          model,
          promptImage: request.promptImage,
          prompt_text: request.prompt,
          duration,
          ratio,
          quality: request.quality ?? "quality",
          style: request.style ?? "cinematic",
        }),
      }),
      request.timeoutMs ?? 90000,
      "runway",
    );
    if (!createResponse.ok) {
      const responseBody = await safeVideoResponseBody(createResponse);
      logRunwayError(RUNWAY_VIDEO_ENDPOINT, createResponse.status, responseBody);
      throw new ProviderError(
        "runway",
        `HTTP_${createResponse.status}`,
        `Runway job creation failed with ${createResponse.status}${responseBody ? `: ${responseBody}` : "."}`,
        createResponse.status === 429 || createResponse.status >= 500,
        responseBody || null,
      );
    }
    const createPayload = await createResponse.json() as RunwayCreateResponse;
    const providerJobId = createPayload.id ?? createPayload.task_id;
    const immediateVideo = createPayload.output?.url;
    const immediateThumb = createPayload.output?.thumbnail_url ?? null;
    if (!providerJobId && !immediateVideo) {
      throw new ProviderError("runway", "MISSING_JOB_ID", "Runway did not return a job id.", true);
    }
    if (debugVideo) {
      console.info("[video] job_created", { provider: "runway", jobId: providerJobId ?? null, immediateVideo: Boolean(immediateVideo) });
    }

    const resolved = immediateVideo
      ? { videoUrl: immediateVideo, thumbnailUrl: immediateThumb }
      : await pollVideoJob({
        provider: "runway",
        apiKey,
        jobId: providerJobId ?? "",
        pollUrl: `https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(providerJobId ?? "")}`,
        headers: {
          "X-Runway-Version": RUNWAY_API_VERSION,
        },
        timeoutMs: request.timeoutMs ?? 180000,
        normalize: (payload) => {
          const data = payload as {
            status?: string;
            error?: unknown;
            output?: { url?: string; thumbnail_url?: string };
          };
          const status = String(data.status ?? "").toLowerCase();
          return {
            done: status === "completed" || Boolean(data.output?.url),
            failed: status === "failed" || Boolean(data.error),
            videoUrl: data.output?.url,
            thumbnailUrl: data.output?.thumbnail_url,
          };
        },
      });

    assertVideoUrl("runway", resolved.videoUrl);
    if (debugVideo) {
      console.info("[video] completion_status", { provider: "runway", jobId: providerJobId ?? null, completed: true });
    }
    return {
      model,
      videoUrl: resolved.videoUrl,
      downloadUrl: resolved.videoUrl,
      thumbnailUrl: resolved.thumbnailUrl ?? request.promptImage ?? "https://placehold.co/720x1280/png?text=Runway+Thumbnail",
      providerJobId: providerJobId ?? `runway-${startedAt}`,
      prompt: request.prompt,
      durationSeconds: duration,
      status: "completed",
      usage: usageFromVideo(request.prompt, startedAt, "runway"),
    };
  }, request.retries ?? 2);
}
