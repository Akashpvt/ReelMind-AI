import { ProviderError } from "@/lib/providers/provider-errors";
import { assertAudioResponse, audioDataUrl, estimateDurationMs, executeVoiceRequest, type VoiceClientRequest, type VoiceClientResponse, usageFromVoice, withTimeout } from "@/lib/providers/voice-client-utils";

export async function generateVoice(request: VoiceClientRequest): Promise<VoiceClientResponse> {
  const startedAt = Date.now();
  const model = request.model || "gpt-4o-mini-tts";
  const voice = request.voiceId || "alloy";

  return executeVoiceRequest("openai-voice", async () => {
    const response = await withTimeout(
      fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify({
          model,
          voice,
          input: request.text,
          response_format: "mp3",
          speed: typeof request.speed === "number" ? request.speed : 1,
          instructions: [request.language ? `Language: ${request.language}` : "", request.emotion ? `Emotion: ${request.emotion}` : ""].filter(Boolean).join(" | ") || undefined,
        }),
      }),
      request.timeoutMs ?? 45000,
      "openai-voice",
    );

    if (!response.ok) {
      throw new ProviderError("openai-voice", `HTTP_${response.status}`, `OpenAI Voice request failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    }

    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const audioBuffer = await response.arrayBuffer();
    const audioUrl = audioDataUrl(contentType, audioBuffer);
    assertAudioResponse("openai-voice", audioUrl);

    return {
      model,
      audioUrl,
      downloadUrl: audioUrl,
      voiceId: voice,
      durationMs: estimateDurationMs(request.text, request.speed),
      transcript: request.text,
      usage: usageFromVoice(request.text, voice, startedAt),
    };
  }, request.retries ?? 2);
}
