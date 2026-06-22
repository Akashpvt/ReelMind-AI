export interface TrendReport {
  id: string;
  niche: string;
  keyword: string;
  growth: number;
  competition: number;
  opportunity: number;
  confidence: number;
  createdAt: string;
}

const trendKeywords = {
  AI: ["AI agents", "AI workflows", "prompt systems", "automation stacks"],
  Education: ["micro-learning", "study systems", "AI tutors", "skill sprints"],
  Finance: ["money habits", "side income", "creator finance", "AI investing"],
  Fitness: ["hybrid training", "mobility reset", "protein prep", "habit tracking"],
  Startup: ["solo founder", "MVP launch", "product-market fit", "AI SaaS"],
  Politics: ["youth voting", "policy explainers", "debate clips", "civic literacy"],
} as const;

function score(seed: string, offset: number) {
  return seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), offset) % 37;
}

export function generateTrendReports(niche: string): TrendReport[] {
  const normalized = niche in trendKeywords ? (niche as keyof typeof trendKeywords) : "AI";
  return trendKeywords[normalized].map((keyword, index) => {
    const growth = 58 + score(`${niche}-${keyword}`, index * 3);
    const competition = 32 + score(`${keyword}-${niche}`, index * 5);
    return {
      id: `trend-${normalized}-${index}`,
      niche: normalized,
      keyword,
      growth,
      competition,
      opportunity: Math.max(35, Math.min(96, growth - Math.floor(competition / 3) + 22)),
      confidence: 68 + score(keyword, 11) / 2,
      createdAt: new Date().toISOString(),
    };
  });
}
