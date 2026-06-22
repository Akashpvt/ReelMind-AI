import { ProviderError } from "@/lib/providers/provider-errors";
import { assertVideoUrl, executeVideoRequest, pollVideoJob, safeVideoResponseBody, type VideoClientRequest, type VideoClientResponse, usageFromVideo, withTimeout } from "@/lib/providers/video-client-utils";

type VeoCreateResponse = {
  name?: string;
  id?: string;
  operation?: { name?: string };
  status?: string;
  done?: boolean;
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
  };
};

const GEMINI_VIDEO_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_VIDEO_MODEL = "veo-3.1-generate-preview";

function normalizeVeoDuration(input?: number) {
  if (input === 4 || input === 6 || input === 8) return input;
  return 8;
}

export function getVeoEndpoint(model = GEMINI_VIDEO_MODEL) {
  return `${GEMINI_VIDEO_BASE_URL}/models/${model}:predictLongRunning`;
}

export async function generateVideo(request: VideoClientRequest): Promise<VideoClientResponse> {
  const startedAt = Date.now();
  const duration = normalizeVeoDuration(request.durationSeconds);
  const model = request.model || GEMINI_VIDEO_MODEL;
  const veoEndpoint = getVeoEndpoint(model);
  const debugVideo = process.env.DEBUG_VIDEO === "true" || process.env.DEBUG_TOOLS === "true" || process.env.NODE_ENV === "development";

  return executeVideoRequest("veo", async () => {
    if (debugVideo) {
      console.info("[video] provider_selected", { provider: "veo", veoEndpoint, connected: Boolean(request.apiKey), duration, aspectRatio: request.aspectRatio ?? "9:16" });
    }
    const createResponse = await withTimeout(
      fetch(veoEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": request.apiKey ?? "",
        },
        body: JSON.stringify({
          instances: [{ prompt: request.prompt }],
          parameters: {
            durationSeconds: duration,
            aspectRatio: request.aspectRatio ?? "9:16",
          },
        }),
      }),
      request.timeoutMs ?? 90000,
      "veo",
    );
    if (!createResponse.ok) {
      const responseBody = await safeVideoResponseBody(createResponse);
      throw new ProviderError(
        "veo",
        `HTTP_${createResponse.status}`,
        `Veo job creation failed with ${createResponse.status}${responseBody ? `: ${responseBody}` : "."}`,
        createResponse.status === 429 || createResponse.status >= 500,
        responseBody || null,
      );
    }
    const createPayload = await createResponse.json() as VeoCreateResponse;
    const providerJobId = createPayload.name ?? createPayload.id ?? createPayload.operation?.name;
    const immediateVideo = createPayload.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!providerJobId && !immediateVideo) {
      throw new ProviderError("veo", "MISSING_JOB_ID", "Veo did not return a job id.", true);
    }
    if (debugVideo) {
      console.info("[video] job_created", { provider: "veo", jobId: providerJobId ?? null, immediateVideo: Boolean(immediateVideo) });
    }

    const resolved = immediateVideo
      ? { videoUrl: immediateVideo, thumbnailUrl: null }
      : await pollVideoJob({
        provider: "veo",
        apiKey: request.apiKey,
        jobId: providerJobId ?? "",
        pollUrl: `${GEMINI_VIDEO_BASE_URL}/${providerJobId ?? ""}`,
        headers: { "x-goog-api-key": request.apiKey ?? "" },
        timeoutMs: request.timeoutMs ?? 180000,
        normalize: (payload) => {
          const data = payload as {
            done?: boolean;
            status?: string;
            error?: unknown;
            response?: {
              generateVideoResponse?: {
                generatedSamples?: Array<{ video?: { uri?: string } }>;
              };
            };
          };
          const status = String(data.status ?? "").toLowerCase();
          const videoUrl = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
          return {
            done: Boolean(data.done) || status === "completed" || Boolean(videoUrl),
            failed: Boolean(data.error) || status === "failed",
            videoUrl,
          };
        },
      });

    assertVideoUrl("veo", resolved.videoUrl);
    if (debugVideo) {
      console.info("[video] completion_status", { provider: "veo", jobId: providerJobId ?? null, completed: true });
    }
    return {
      model,
      videoUrl: resolved.videoUrl,
      downloadUrl: resolved.videoUrl,
      thumbnailUrl: resolved.thumbnailUrl ?? "https://placehold.co/720x1280/png?text=Veo+Thumbnail",
      providerJobId: providerJobId ?? `veo-${startedAt}`,
      prompt: request.prompt,
      durationSeconds: duration,
      status: "completed",
      usage: usageFromVideo(request.prompt, startedAt, "veo"),
    };
  }, request.retries ?? 2);
}
