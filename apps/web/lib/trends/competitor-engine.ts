export interface CompetitorReport {
  id: string;
  creator: string;
  niche: string;
  avgViews: number;
  postingFrequency: string;
  hookPatterns: string[];
  thumbnailPatterns: string[];
  ctaPatterns: string[];
}

const creators = ["Nova Creator Lab", "Viral Craft", "Signal Studio", "Creator Pulse"];

export function generateCompetitorReports(niche: string): CompetitorReport[] {
  return creators.map((creator, index) => ({
    id: `competitor-${index}`,
    creator,
    niche,
    avgViews: 18000 + index * 7400 + niche.length * 620,
    postingFrequency: ["Daily", "5x / week", "3x / week", "Twice daily"][index],
    hookPatterns: ["Curiosity gap", "Audience callout", "Fast contradiction"].slice(0, 2 + (index % 2)),
    thumbnailPatterns: ["High contrast face", "Bold 3-word overlay", "Before/after split"].slice(0, 2 + (index % 2)),
    ctaPatterns: ["Comment keyword", "Save this", "Follow for part two"].slice(0, 2 + (index % 2)),
  }));
}
