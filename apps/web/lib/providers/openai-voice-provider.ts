import { BaseProvider } from "@/lib/providers/base-provider";
import { generateVoice } from "@/lib/providers/openai-voice-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, VoicePayload, VoiceProviderData } from "@/lib/providers/provider-types";

export class OpenAIVoiceProvider extends BaseProvider<VoicePayload, VoiceProviderData> {
  readonly definition: ProviderDefinition = {
    id: "openai-voice",
    name: "OpenAI Voice",
    capabilities: ["voice"],
    requiredEnv: ["OPENAI_API_KEY"],
    defaultModel: "gpt-4o-mini-tts",
    docsUrl: "https://platform.openai.com/docs/guides/text-to-speech",
  };

  protected async mock(request: ProviderRequest<VoicePayload>): Promise<VoiceProviderData> {
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      audioUrl: null,
      downloadUrl: null,
      voiceId: request.payload.voiceId ?? "alloy",
      durationMs: Math.max(1600, request.payload.text.length * 38),
      transcript: request.payload.text,
    };
  }

  protected async callProvider(request: ProviderRequest<VoicePayload>, env: ProviderEnv): Promise<VoiceProviderData> {
    return generateVoice({
      apiKey: env.OPENAI_API_KEY,
      text: request.payload.text,
      voiceId: request.payload.voiceId,
      language: request.payload.language,
      emotion: request.payload.emotion,
      speed: request.payload.speed,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
