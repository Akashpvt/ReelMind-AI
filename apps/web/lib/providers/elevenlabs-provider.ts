import { BaseProvider } from "@/lib/providers/base-provider";
import { generateVoice } from "@/lib/providers/elevenlabs-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, VoicePayload, VoiceProviderData } from "@/lib/providers/provider-types";

export class ElevenLabsProvider extends BaseProvider<VoicePayload, VoiceProviderData> {
  readonly definition: ProviderDefinition = {
    id: "elevenlabs",
    name: "ElevenLabs",
    capabilities: ["voice"],
    requiredEnv: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
    defaultModel: "eleven_multilingual_v2",
    docsUrl: "https://elevenlabs.io/docs",
  };

  protected async mock(request: ProviderRequest<VoicePayload>): Promise<VoiceProviderData> {
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      audioUrl: null,
      downloadUrl: null,
      voiceId: request.payload.voiceId ?? "JBFqnCBsd6RMkjVDRZzb",
      durationMs: Math.max(3000, request.payload.text.length * 45),
      transcript: request.payload.text,
    };
  }

  protected async callProvider(request: ProviderRequest<VoicePayload>, env: ProviderEnv): Promise<VoiceProviderData> {
    return generateVoice({
      apiKey: env.ELEVENLABS_API_KEY,
      text: request.payload.text,
      voiceId: request.payload.voiceId ?? env.ELEVENLABS_VOICE_ID,
      language: request.payload.language,
      emotion: request.payload.emotion,
      speed: request.payload.speed,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
