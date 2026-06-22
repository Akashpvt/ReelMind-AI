export type GeneratedOutputs = {
  hook: string;
  script: string;
  caption: string;
  cta: string;
  videoPrompt: string;
  thumbnailPrompt: string;
  storyboard: string;
  voiceover: string;
  productionPack: string;
};

export type OutputKey = keyof GeneratedOutputs;

export const outputOrder = [
  "hook",
  "script",
  "caption",
  "cta",
  "videoPrompt",
  "thumbnailPrompt",
  "storyboard",
  "voiceover",
  "productionPack",
] as const;

export type StoryboardScene = {
  sceneNumber: number;
  title: string;
  timestamp: string;
  sceneType: "Hook scene" | "B-roll" | "Talking head" | "CTA ending" | "Product showcase" | "Emotional transition";
  shotType: string;
  narration: string;
  visualDescription: string;
  cameraMovement: string;
  transition: string;
  emotion: string;
  onScreenText: string;
  soundCue: string;
};

export type VoiceoverBeat = {
  timestamp: string;
  line: string;
  emotion: string;
  pauseAfter: string;
  emphasis: string;
};

export type VoiceoverGuide = {
  style: string;
  recommendedVoiceType: string;
  narrationSpeed: string;
  emotionalIntensity: string;
  deliveryStyle: string;
  pausePositions: string[];
  emphasisSuggestions: string[];
  pacingGuidance: string;
  scriptBeats: VoiceoverBeat[];
};

export type ProductionScene = {
  sceneNumber: number;
  timestamp: string;
  sceneTitle: string;
  veoPrompt: string;
  klingPrompt: string;
  runwayPrompt: string;
  pikaPrompt: string;
  lumaPrompt: string;
  cameraMotion: string;
  lens: string;
  lighting: string;
  environment: string;
  characterConsistency: string;
  emotion: string;
  transition: string;
  negativePrompt: string;
};

export type ProductionPack = {
  masterDirection: string;
  visualStyle: string;
  characterProfile: string;
  wardrobe: string;
  colorPalette: string;
  lightingStyle: string;
  cameraLanguage: string;
  pacingNotes: string;
  continuityRules: string;
  scenes: ProductionScene[];
};

export type StreamEvent =
  | { type: "retrying"; message: string }
  | { type: "start"; key: OutputKey }
  | { type: "delta"; key: OutputKey; text: string }
  | { type: "complete"; key: OutputKey }
  | { type: "done"; model?: string }
  | { type: "error"; error: string };

export type GenerateRequest = {
  prompt: string;
  niche: string;
  language: string;
  tone: string;
  duration: string;
};

export const supportedNiches = [
  "Creator Growth",
  "Fitness",
  "Finance",
  "Fashion",
  "Food",
  "Technology",
  "Business",
] as const;

export const supportedLanguages = ["Hinglish", "Hindi", "English"] as const;
export const supportedDurations = ["15s", "30s", "45s", "60s"] as const;
export const supportedTones = ["Cinematic", "Motivational", "Emotional", "Funny", "Educational"] as const;

export function emptyGeneratedOutputs(): GeneratedOutputs {
  return {
    hook: "",
    script: "",
    caption: "",
    cta: "",
    videoPrompt: "",
    thumbnailPrompt: "",
    storyboard: "",
    voiceover: "",
    productionPack: "",
  };
}

export function isGeneratedOutputs(value: unknown): value is GeneratedOutputs {
  if (!value || typeof value !== "object") {
    return false;
  }

  const outputs = value as Record<string, unknown>;
  return outputOrder.every(
    (key) => typeof outputs[key] === "string" && outputs[key].trim().length > 0,
  );
}

function cleanJsonText(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function parseStoryboardScenes(content: string): StoryboardScene[] {
  const trimmed = cleanJsonText(content);
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): StoryboardScene | null => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const row = item as Record<string, unknown>;
        const sceneNumber = typeof row.sceneNumber === "number" ? row.sceneNumber : Number(row.scene_number);
        const title = typeof row.title === "string" ? row.title : `Scene ${Number.isFinite(sceneNumber) ? sceneNumber : ""}`;
        const sceneType = typeof row.sceneType === "string" ? row.sceneType : typeof row.scene_type === "string" ? row.scene_type : "B-roll";
        const validSceneTypes = ["Hook scene", "B-roll", "Talking head", "CTA ending", "Product showcase", "Emotional transition"];

        return {
          sceneNumber: Number.isFinite(sceneNumber) ? sceneNumber : 1,
          title,
          timestamp: typeof row.timestamp === "string" ? row.timestamp : "0:00-0:03",
          sceneType: validSceneTypes.includes(sceneType)
            ? (sceneType as StoryboardScene["sceneType"])
            : "B-roll",
          shotType: typeof row.shotType === "string" ? row.shotType : typeof row.shot_type === "string" ? row.shot_type : "Medium shot",
          narration: typeof row.narration === "string" ? row.narration : "",
          visualDescription:
            typeof row.visualDescription === "string"
              ? row.visualDescription
              : typeof row.visual_description === "string"
                ? row.visual_description
                : "",
          cameraMovement:
            typeof row.cameraMovement === "string"
              ? row.cameraMovement
              : typeof row.camera_movement === "string"
                ? row.camera_movement
                : "",
          transition: typeof row.transition === "string" ? row.transition : "",
          emotion: typeof row.emotion === "string" ? row.emotion : "",
          onScreenText:
            typeof row.onScreenText === "string"
              ? row.onScreenText
              : typeof row.on_screen_text === "string"
                ? row.on_screen_text
                : "",
          soundCue: typeof row.soundCue === "string" ? row.soundCue : typeof row.sound_cue === "string" ? row.sound_cue : "",
        };
      })
      .filter((scene): scene is StoryboardScene => scene !== null);
  } catch {
    return [];
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function parseVoiceoverGuide(content: string): VoiceoverGuide | null {
  const trimmed = cleanJsonText(content);
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const row = parsed as Record<string, unknown>;
    const rawBeats = Array.isArray(row.scriptBeats)
      ? row.scriptBeats
      : Array.isArray(row.script_beats)
        ? row.script_beats
        : [];

    return {
      style: typeof row.style === "string" ? row.style : "Cinematic narrator",
      recommendedVoiceType:
        typeof row.recommendedVoiceType === "string"
          ? row.recommendedVoiceType
          : typeof row.recommended_voice_type === "string"
            ? row.recommended_voice_type
            : "Warm cinematic creator voice",
      narrationSpeed:
        typeof row.narrationSpeed === "string"
          ? row.narrationSpeed
          : typeof row.narration_speed === "string"
            ? row.narration_speed
            : "Medium",
      emotionalIntensity:
        typeof row.emotionalIntensity === "string"
          ? row.emotionalIntensity
          : typeof row.emotional_intensity === "string"
            ? row.emotional_intensity
            : "Balanced",
      deliveryStyle:
        typeof row.deliveryStyle === "string"
          ? row.deliveryStyle
          : typeof row.delivery_style === "string"
            ? row.delivery_style
            : "Clear, creator-ready delivery",
      pausePositions: stringArray(row.pausePositions ?? row.pause_positions),
      emphasisSuggestions: stringArray(row.emphasisSuggestions ?? row.emphasis_suggestions),
      pacingGuidance:
        typeof row.pacingGuidance === "string"
          ? row.pacingGuidance
          : typeof row.pacing_guidance === "string"
            ? row.pacing_guidance
            : "",
      scriptBeats: rawBeats
        .map((item): VoiceoverBeat | null => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const beat = item as Record<string, unknown>;
          return {
            timestamp: typeof beat.timestamp === "string" ? beat.timestamp : "",
            line: typeof beat.line === "string" ? beat.line : "",
            emotion: typeof beat.emotion === "string" ? beat.emotion : "",
            pauseAfter:
              typeof beat.pauseAfter === "string"
                ? beat.pauseAfter
                : typeof beat.pause_after === "string"
                  ? beat.pause_after
                  : "",
            emphasis: typeof beat.emphasis === "string" ? beat.emphasis : "",
          };
        })
        .filter((beat): beat is VoiceoverBeat => beat !== null),
    };
  } catch {
    return null;
  }
}

function stringValue(row: Record<string, unknown>, camelKey: string, snakeKey: string, fallback = "") {
  const value = row[camelKey] ?? row[snakeKey];
  return typeof value === "string" ? value : fallback;
}

export function parseProductionPack(content: string): ProductionPack | null {
  const trimmed = cleanJsonText(content);
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const row = parsed as Record<string, unknown>;
    const rawScenes = Array.isArray(row.scenes) ? row.scenes : [];
    const scenes = rawScenes
      .map((item): ProductionScene | null => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const scene = item as Record<string, unknown>;
        const sceneNumber = Number(scene.sceneNumber ?? scene.scene_number);
        return {
          sceneNumber: Number.isFinite(sceneNumber) ? sceneNumber : 1,
          timestamp: stringValue(scene, "timestamp", "timestamp", "0:00-0:03"),
          sceneTitle: stringValue(scene, "sceneTitle", "scene_title", "Production scene"),
          veoPrompt: stringValue(scene, "veoPrompt", "veo_prompt"),
          klingPrompt: stringValue(scene, "klingPrompt", "kling_prompt"),
          runwayPrompt: stringValue(scene, "runwayPrompt", "runway_prompt"),
          pikaPrompt: stringValue(scene, "pikaPrompt", "pika_prompt"),
          lumaPrompt: stringValue(scene, "lumaPrompt", "luma_prompt"),
          cameraMotion: stringValue(scene, "cameraMotion", "camera_motion", "Smooth controlled motion"),
          lens: stringValue(scene, "lens", "lens", "35mm cinematic lens"),
          lighting: stringValue(scene, "lighting", "lighting", "Soft cinematic contrast"),
          environment: stringValue(scene, "environment", "environment", "Creator-ready environment"),
          characterConsistency: stringValue(scene, "characterConsistency", "character_consistency", "Keep subject consistent"),
          emotion: stringValue(scene, "emotion", "emotion", "Focused"),
          transition: stringValue(scene, "transition", "transition", "Clean cut"),
          negativePrompt: stringValue(scene, "negativePrompt", "negative_prompt", "No warped hands, no text artifacts, no flicker"),
        };
      })
      .filter((scene): scene is ProductionScene => scene !== null);

    return {
      masterDirection: stringValue(row, "masterDirection", "master_direction"),
      visualStyle: stringValue(row, "visualStyle", "visual_style"),
      characterProfile: stringValue(row, "characterProfile", "character_profile"),
      wardrobe: stringValue(row, "wardrobe", "wardrobe"),
      colorPalette: stringValue(row, "colorPalette", "color_palette"),
      lightingStyle: stringValue(row, "lightingStyle", "lighting_style"),
      cameraLanguage: stringValue(row, "cameraLanguage", "camera_language"),
      pacingNotes: stringValue(row, "pacingNotes", "pacing_notes"),
      continuityRules: stringValue(row, "continuityRules", "continuity_rules"),
      scenes,
    };
  } catch {
    return null;
  }
}

export function isStreamEvent(value: unknown): value is StreamEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Record<string, unknown>;
  if (event.type === "done") {
    return event.model === undefined || typeof event.model === "string";
  }

  if (event.type === "retrying") {
    return typeof event.message === "string";
  }

  if (event.type === "error") {
    return typeof event.error === "string";
  }

  if (event.type === "start" || event.type === "complete") {
    return typeof event.key === "string" && outputOrder.includes(event.key as OutputKey);
  }

  return (
    event.type === "delta" &&
    typeof event.key === "string" &&
    outputOrder.includes(event.key as OutputKey) &&
    typeof event.text === "string"
  );
}

export function isGenerateRequest(value: unknown): value is GenerateRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Record<string, unknown>;
  return (
    typeof request.prompt === "string" &&
    request.prompt.trim().length > 0 &&
    request.prompt.trim().length <= 1200 &&
    typeof request.niche === "string" &&
    supportedNiches.includes(request.niche as (typeof supportedNiches)[number]) &&
    typeof request.language === "string" &&
    supportedLanguages.includes(request.language as (typeof supportedLanguages)[number]) &&
    typeof request.tone === "string" &&
    supportedTones.includes(request.tone as (typeof supportedTones)[number]) &&
    typeof request.duration === "string" &&
    supportedDurations.includes(request.duration as (typeof supportedDurations)[number])
  );
}
