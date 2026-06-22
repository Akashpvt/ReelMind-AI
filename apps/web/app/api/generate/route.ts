import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { isGenerateRequest, type OutputKey, type StreamEvent } from "@/lib/reel-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defaultModel = "gemini-2.5-flash-lite";
const retryDelays = [1000, 3000, 6000] as const;

const sections: Array<{ key: OutputKey; label: string; instruction: string; marker?: string }> = [
  {
    key: "hook",
    label: "Viral Hook",
    instruction: "Write a single arresting opening line that can be spoken or displayed in the first two seconds.",
  },
  {
    key: "script",
    label: "Reel Script",
    marker: "<<<REEL_SCRIPT>>>",
    instruction: "Write a filmable short-form script with clear time or shot beats that fits the target duration.",
  },
  {
    key: "caption",
    label: "Caption",
    marker: "<<<CAPTION>>>",
    instruction: "Write one publish-ready caption with a natural hook and a small set of relevant hashtags.",
  },
  {
    key: "cta",
    label: "CTA",
    marker: "<<<CTA>>>",
    instruction: "Write one concise audience action that naturally follows this reel.",
  },
  {
    key: "videoPrompt",
    label: "Video Prompt",
    marker: "<<<VIDEO_PROMPT>>>",
    instruction: "Write a cinematic vertical video-generation prompt with subject, motion, camera, lighting, and mood.",
  },
  {
    key: "thumbnailPrompt",
    label: "Thumbnail Prompt",
    marker: "<<<THUMBNAIL_PROMPT>>>",
    instruction: "Write a detailed high-contrast thumbnail image prompt optimized for a mobile feed.",
  },
  {
    key: "storyboard",
    label: "Storyboard",
    marker: "<<<STORYBOARD>>>",
    instruction:
      "Return only a valid JSON array of 5 to 8 scene objects. Each object must include sceneNumber, title, timestamp, sceneType, shotType, narration, visualDescription, cameraMovement, transition, emotion, onScreenText, and soundCue. Use sceneType values from Hook scene, B-roll, Talking head, CTA ending, Product showcase, Emotional transition. Make the flow realistic, cinematic, and optimized for short-form pacing.",
  },
  {
    key: "voiceover",
    label: "Voiceover",
    marker: "<<<VOICEOVER>>>",
    instruction:
      "Return only a valid JSON object for a creator-ready voiceover studio. Include style, recommendedVoiceType, narrationSpeed, emotionalIntensity, deliveryStyle, pausePositions, emphasisSuggestions, pacingGuidance, and scriptBeats. scriptBeats must be an array of timestamped narration beats with timestamp, line, emotion, pauseAfter, and emphasis. Choose the best style from Cinematic narrator, Emotional storytelling, Viral energetic, Luxury brand, Educational explainer, Hindi/Hinglish creator mode. Base the voiceover on the reel concept and storyboard flow with short-form optimized pacing.",
  },
  {
    key: "productionPack",
    label: "Production Pack",
    marker: "<<<PRODUCTION_PACK>>>",
    instruction:
      "Return only a valid JSON object for an AI video production pipeline. Add top-level masterDirection, visualStyle, characterProfile, wardrobe, colorPalette, lightingStyle, cameraLanguage, pacingNotes, continuityRules, and scenes. For every storyboard scene, add a scenes item with sceneNumber, timestamp, sceneTitle, veoPrompt, klingPrompt, runwayPrompt, pikaPrompt, lumaPrompt, cameraMotion, lens, lighting, environment, characterConsistency, emotion, transition, and negativePrompt. Prompts must be AI-video-ready for Veo, Kling, Runway, Pika, and Luma. If storyboard details are thin or missing, infer scenes from the reel script while preserving continuity, character consistency, cinematic camera language, and short-form pacing.",
  },
];

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }

  return null;
}

function getSafeGeminiErrorDetail(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {
      message: error instanceof Error ? error.message : undefined,
      status: undefined,
      code: undefined,
      details: undefined,
    };
  }

  const errorRecord = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    details?: unknown;
  };

  return {
    message: typeof errorRecord.message === "string" ? errorRecord.message : undefined,
    status: errorRecord.status,
    code: errorRecord.code,
    details: errorRecord.details,
  };
}

function isTemporaryError(error: unknown) {
  const status = getErrorStatus(error);
  if (status === 429 || status === 503) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /network|fetch failed|timeout|timed out|econnreset|econnrefused|socket|temporar/i.test(error.message);
}

function wait(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Request aborted.", "AbortError"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Request aborted.", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const selectedModel = process.env.GEMINI_MODEL || defaultModel;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isGenerateRequest(body)) {
    return NextResponse.json({ error: "Please provide valid prompt and creator settings." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const creatorBrief = [
    "Create creator-ready short-form reel content.",
    "The content must feel useful, natural, filmable, and specific to the supplied creator brief.",
    "Do not claim that the reel will go viral. Do not include markdown headings or code fences.",
    `Topic: ${body.prompt.trim()}`,
    `Niche: ${body.niche}`,
    `Language: ${body.language}`,
    `Tone: ${body.tone}`,
    `Target duration: ${body.duration}`,
    "Use the selected language naturally. For Hinglish, blend conversational Hindi and English in Latin script.",
  ].join("\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void (async () => {
        try {
          const contents = [
            creatorBrief,
            "Generate all nine assets below in this exact order.",
            "Begin directly with Viral Hook content. Before each following asset, print its separator exactly on a new line.",
            sections
              .map((section, index) => `${index === 0 ? "No separator" : section.marker} ${section.label}: ${section.instruction}`)
              .join("\n"),
            "Never print any additional headings or separators.",
          ].join("\n");
          const openStream = async (model: string) => {
            let latestError: unknown;

            for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
              try {
                return await ai.models.generateContentStream({
                  model,
                  contents,
                  config: {
                    systemInstruction:
                      "You are ReelMind AI, an expert short-form video strategist. Produce crisp creator-ready output in the requested language and tone.",
                    temperature: 0.8,
                    abortSignal: request.signal,
                  },
                });
              } catch (error) {
                latestError = error;
                if (!isTemporaryError(error) || attempt === retryDelays.length) {
                  throw error;
                }

                send({ type: "retrying", message: "Gemini is busy, retrying..." });
                await wait(retryDelays[attempt], request.signal);
              }
            }

            throw latestError;
          };

          const model = selectedModel;
          const response = await openStream(model);

          let sectionIndex = 0;
          let pendingText = "";
          const receivedText = new Map<OutputKey, string>();
          const currentSection = () => sections[sectionIndex];
          const sendDelta = (text: string) => {
            if (!text) {
              return;
            }
            const key = currentSection().key;
            receivedText.set(key, `${receivedText.get(key) ?? ""}${text}`);
            send({ type: "delta", key, text });
          };

          send({ type: "start", key: currentSection().key });
          for await (const chunk of response) {
            if (request.signal.aborted) {
              controller.close();
              return;
            }

            pendingText += chunk.text ?? "";
            while (sectionIndex < sections.length - 1) {
              const marker = sections[sectionIndex + 1].marker;
              if (!marker) {
                throw new Error("A stream separator is missing.");
              }

              const markerPosition = pendingText.indexOf(marker);
              if (markerPosition >= 0) {
                sendDelta(pendingText.slice(0, markerPosition).replace(/\s+$/, ""));
                if (!receivedText.get(currentSection().key)?.trim()) {
                  throw new Error(`Gemini returned empty content for ${currentSection().key}.`);
                }
                send({ type: "complete", key: currentSection().key });
                sectionIndex += 1;
                send({ type: "start", key: currentSection().key });
                pendingText = pendingText.slice(markerPosition + marker.length).replace(/^\s+/, "");
                continue;
              }

              const safeLength = Math.max(0, pendingText.length - marker.length + 1);
              sendDelta(pendingText.slice(0, safeLength));
              pendingText = pendingText.slice(safeLength);
              break;
            }

            if (sectionIndex === sections.length - 1) {
              sendDelta(pendingText);
              pendingText = "";
            }
          }

          sendDelta(pendingText.trimEnd());
          if (sectionIndex !== sections.length - 1 || !receivedText.get(currentSection().key)?.trim()) {
            throw new Error("Gemini returned an incomplete section stream.");
          }
          send({ type: "complete", key: currentSection().key });

          send({ type: "done", model });
          controller.close();
        } catch (error) {
          if (request.signal.aborted) {
            controller.close();
            return;
          }

          if (isTemporaryError(error)) {
            console.error("Gemini generation error detail:", getSafeGeminiErrorDetail(error));
            send({ type: "error", error: "Gemini is busy right now. Please try again in a moment." });
          } else {
            console.error("Gemini reel generation stream failed:", error);
            send({ type: "error", error: "Unable to generate your reel package right now. Please try again." });
          }
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
