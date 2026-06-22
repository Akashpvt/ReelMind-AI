export interface ViralPattern {
  id: string;
  category: string;
  pattern: string;
  score: number;
  examples: string[];
}

const patterns = [
  {
    category: "Hook",
    pattern: "Curiosity Hook",
    examples: ["Nobody tells creators this...", "The fastest way to fix this is..."],
  },
  {
    category: "Story",
    pattern: "Transformation Story",
    examples: ["Before I changed this habit...", "From zero traction to repeatable growth..."],
  },
  {
    category: "Audience",
    pattern: "Audience Callout",
    examples: ["If you are a new creator...", "Freelancers, stop doing this..."],
  },
  {
    category: "Opinion",
    pattern: "Contrarian Opinion",
    examples: ["Posting daily is not the strategy...", "Your niche is not the problem..."],
  },
  {
    category: "Visual",
    pattern: "Before vs After",
    examples: ["Old workflow vs AI workflow", "Manual editing vs creator OS"],
  },
];

export function detectViralPatterns(niche: string): ViralPattern[] {
  return patterns.map((item, index) => ({
    id: `pattern-${index}`,
    ...item,
    score: Math.min(97, 68 + index * 5 + (niche.length % 9)),
  }));
}
