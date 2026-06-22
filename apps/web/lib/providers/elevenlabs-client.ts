import { ProviderError } from "@/lib/providers/provider-errors";
import { assertAudioResponse, audioDataUrl, estimateDurationMs, executeVoiceRequest, type VoiceClientRequest, type VoiceClientResponse, usageFromVoice, withTimeout } from "@/lib/providers/voice-client-utils";

const ELEVENLABS_DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";

function safeErrorMessage(body: string) {
  return body
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

export async function generateVoice(request: VoiceClientRequest): Promise<VoiceClientResponse> {
  const startedAt = Date.now();
  const voiceId = request.voiceId || ELEVENLABS_DEFAULT_VOICE_ID;
  const model = request.model || ELEVENLABS_MODEL_ID;

  return executeVoiceRequest("elevenlabs", async () => {
    const response = await withTimeout(
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": request.apiKey ?? "",
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: request.text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }),
      request.timeoutMs ?? 45000,
      "elevenlabs",
    );

    if (!response.ok) {
      const errorBody = safeErrorMessage(await response.text().catch(() => ""));
      console.warn("[voice] elevenlabs_error_response", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody || "[empty response body]",
      });
      throw new ProviderError(
        "elevenlabs",
        `HTTP_${response.status}`,
        `ElevenLabs request failed with ${response.status}${errorBody ? `: ${errorBody}` : "."}`,
        response.status === 429 || response.status >= 500,
      );
    }

    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const audioBuffer = await response.arrayBuffer();
    const audioUrl = audioDataUrl(contentType, audioBuffer);
    assertAudioResponse("elevenlabs", audioUrl);

    return {
      model,
      audioUrl,
      downloadUrl: audioUrl,
      voiceId,
      durationMs: estimateDurationMs(request.text, request.speed),
      transcript: request.text,
      usage: usageFromVoice(request.text, voiceId, startedAt),
    };
  }, request.retries ?? 2);
}
