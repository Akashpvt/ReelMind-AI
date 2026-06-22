export type MemoryCategory = "hook" | "title" | "thumbnail" | "audience" | "pattern";

export type MemoryMetrics = {
  views: number;
  ctr: number;
  retention: number;
  engagement: number;
  conversion: number;
};

export type CreatorMemory = {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  niche: string;
  pattern: string;
  score: number;
  metrics: MemoryMetrics;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemoryRecommendation = {
  topSimilarHook: CreatorMemory;
  topSimilarTitle: CreatorMemory;
  bestHistoricalPattern: CreatorMemory;
};

type MemoryInput = Omit<CreatorMemory, "id" | "score" | "archived" | "createdAt" | "updatedAt"> & {
  id?: string;
  archived?: boolean;
};

const defaultMetrics: MemoryMetrics = {
  views: 0,
  ctr: 0,
  retention: 0,
  engagement: 0,
  conversion: 0,
};

function now() {
  return new Date().toISOString();
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `memory-${hash.toString(16)}`;
}

export function scoreMemory(metrics: Partial<MemoryMetrics>) {
  const normalized = { ...defaultMetrics, ...metrics };
  const viewsScore = Math.min(100, normalized.views / 1000);
  return Math.round(
    viewsScore * 0.22 +
      normalized.ctr * 0.24 +
      normalized.retention * 0.22 +
      normalized.engagement * 0.2 +
      normalized.conversion * 0.12,
  );
}

function createMemory(input: MemoryInput): CreatorMemory {
  const metrics = { ...defaultMetrics, ...input.metrics };
  const id = input.id ?? stableId(`${input.category}-${input.niche}-${input.content}`);
  const timestamp = now();
  return {
    ...input,
    id,
    metrics,
    score: scoreMemory(metrics),
    archived: input.archived ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function saveMemory(input: MemoryInput, memories: CreatorMemory[] = []) {
  const memory = createMemory(input);
  return rankMemories([memory, ...memories.filter((item) => item.id !== memory.id)]);
}

export function retrieveMemory(options: {
  niche?: string;
  query?: string;
  category?: MemoryCategory;
  limit?: number;
  memories?: CreatorMemory[];
} = {}) {
  const source = options.memories ?? seedCreatorMemories(options.niche ?? "AI");
  const query = options.query?.toLowerCase().trim();
  const niche = options.niche?.toLowerCase().trim();

  return rankMemories(
    source.filter((memory) => {
      if (memory.archived) return false;
      if (options.category && memory.category !== options.category) return false;
      if (niche && memory.niche.toLowerCase() !== niche) return false;
      if (!query) return true;
      return `${memory.title} ${memory.content} ${memory.pattern}`.toLowerCase().includes(query);
    }),
  ).slice(0, options.limit ?? 8);
}

export function rankMemories(memories: CreatorMemory[]) {
  return [...memories].sort((first, second) => {
    if (second.score !== first.score) return second.score - first.score;
    return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
  });
}

export function updateMemory(id: string, updates: Partial<Omit<CreatorMemory, "id" | "createdAt">>, memories: CreatorMemory[] = []) {
  return rankMemories(
    memories.map((memory) => {
      if (memory.id !== id) return memory;
      const metrics = { ...memory.metrics, ...updates.metrics };
      return {
        ...memory,
        ...updates,
        metrics,
        score: scoreMemory(metrics),
        updatedAt: now(),
      };
    }),
  );
}

export function archiveMemory(id: string, memories: CreatorMemory[] = []) {
  return updateMemory(id, { archived: true }, memories);
}

export function getSmartRecommendations(niche = "AI", query = ""): MemoryRecommendation {
  const topSimilarHook = retrieveMemory({ niche, query, category: "hook", limit: 1 })[0] ?? seedCreatorMemories(niche)[0];
  const topSimilarTitle = retrieveMemory({ niche, query, category: "title", limit: 1 })[0] ?? seedCreatorMemories(niche)[1];
  const bestHistoricalPattern = retrieveMemory({ niche, category: "pattern", limit: 1 })[0] ?? seedCreatorMemories(niche)[2];

  return {
    topSimilarHook,
    topSimilarTitle,
    bestHistoricalPattern,
  };
}

export function seedCreatorMemories(niche = "AI"): CreatorMemory[] {
  const cleanNiche = niche || "AI";
  return rankMemories([
    createMemory({
      category: "hook",
      title: "Contrarian curiosity hook",
      content: `Everyone is using ${cleanNiche} wrong. Here is the 12-second fix.`,
      niche: cleanNiche,
      pattern: "Contrarian opinion with fast payoff",
      metrics: { views: 184000, ctr: 82, retention: 76, engagement: 69, conversion: 38 },
    }),
    createMemory({
      category: "hook",
      title: "Audience callout hook",
      content: `If you create ${cleanNiche} content, save this before your next post.`,
      niche: cleanNiche,
      pattern: "Direct audience callout",
      metrics: { views: 121000, ctr: 75, retention: 72, engagement: 65, conversion: 34 },
    }),
    createMemory({
      category: "title",
      title: "One idea, full creator pipeline",
      content: `I turned one ${cleanNiche} idea into a complete reel system`,
      niche: cleanNiche,
      pattern: "Transformation story",
      metrics: { views: 146000, ctr: 79, retention: 70, engagement: 61, conversion: 31 },
    }),
    createMemory({
      category: "title",
      title: "The hidden workflow",
      content: `The ${cleanNiche} workflow most creators discover too late`,
      niche: cleanNiche,
      pattern: "Information gap",
      metrics: { views: 96000, ctr: 72, retention: 68, engagement: 58, conversion: 29 },
    }),
    createMemory({
      category: "thumbnail",
      title: "Neon split-screen proof",
      content: "Before/after split, shocked creator face, cyan rim light, 3-word promise overlay.",
      niche: cleanNiche,
      pattern: "Before vs After visual proof",
      metrics: { views: 208000, ctr: 86, retention: 73, engagement: 66, conversion: 36 },
    }),
    createMemory({
      category: "thumbnail",
      title: "Minimal luxury contrast",
      content: "Dark premium background, one glowing product/workspace object, bold white outcome text.",
      niche: cleanNiche,
      pattern: "Premium contrast thumbnail",
      metrics: { views: 112000, ctr: 74, retention: 67, engagement: 57, conversion: 30 },
    }),
    createMemory({
      category: "audience",
      title: "Creator audience signal",
      content: "Audience responds best to practical workflows, visible proof, and short high-confidence claims.",
      niche: cleanNiche,
      pattern: "Proof-first education",
      metrics: { views: 164000, ctr: 78, retention: 77, engagement: 71, conversion: 42 },
    }),
    createMemory({
      category: "pattern",
      title: "Winning pattern: tension to tool",
      content: "Start with creator pain, reveal the hidden cost, show the AI workflow, close with a saved-post CTA.",
      niche: cleanNiche,
      pattern: "Tension to tool to saved CTA",
      metrics: { views: 231000, ctr: 84, retention: 81, engagement: 74, conversion: 45 },
    }),
  ]);
}
