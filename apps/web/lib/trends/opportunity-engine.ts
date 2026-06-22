export interface ContentGap {
  id: string;
  topic: string;
  demand: number;
  competition: number;
  opportunity: number;
  recommendation: string;
}

const topics = ["Beginner mistakes", "Workflow teardown", "Tool stack comparison", "30-day experiment", "Myth vs reality"];

export function findContentGaps(niche: string): ContentGap[] {
  return topics.map((topic, index) => {
    const demand = 64 + ((topic.length + niche.length + index * 7) % 28);
    const competition = 28 + ((topic.length * 3 + index * 11) % 42);
    return {
      id: `gap-${index}`,
      topic: `${niche} ${topic}`,
      demand,
      competition,
      opportunity: Math.max(20, Math.min(98, demand - Math.floor(competition / 2) + 18)),
      recommendation: `Create a short reel explaining ${topic.toLowerCase()} for ${niche} audiences with a clear before/after payoff.`,
    };
  });
}

export function generateRecommendedIdeas(niche: string) {
  return findContentGaps(niche).flatMap((gap, index) => [
    {
      id: `idea-${index}-a`,
      title: `${gap.topic}: the simple framework`,
      hook: `Most ${niche} creators miss this one move.`,
      audience: `${niche} creators and operators`,
      viralityScore: Math.min(99, gap.opportunity + 4),
    },
    {
      id: `idea-${index}-b`,
      title: `Before vs after: ${gap.topic}`,
      hook: `Here is the difference nobody shows you.`,
      audience: `Beginners in ${niche}`,
      viralityScore: Math.min(99, gap.opportunity + 1),
    },
  ]).slice(0, 10);
}
