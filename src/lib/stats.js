// Contribution stats live in one place. All render paths derive the same
// counters from the same rules instead of reimplementing the loop.

export const BASE_STATS = { totalMerged: 0, totalOpened: 0, reviews: 0, docsMerged: 0, streak: 0 };

export function deriveStats(contributions, base = {}) {
  const stats = { ...BASE_STATS, ...base };
  for (const c of contributions || []) {
    switch (c.type) {
      case "merge":
        stats.totalMerged++;
        break;
      case "docs":
        stats.docsMerged++;
        break;
      case "review":
        stats.reviews++;
        break;
      default:
        stats.totalOpened++;
    }
  }
  return stats;
}