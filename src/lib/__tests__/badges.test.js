import { describe, it, expect } from "vitest";
import { computeBadges, countStackContribs } from "../badges.js";

const profile = {
  stats: { totalMerged: 6, totalOpened: 0, reviews: 6, docsMerged: 2, streak: 35 },
  primaryLanguage: "TypeScript",
  languages: ["TypeScript", "JavaScript", "Python"],
  contributions: [
    { type: "merge", repo: "vercel/next.js" },
    { type: "merge", repo: "shadcn/ui" },
    { type: "merge", repo: "facebook/react" },
    { type: "merge", repo: "psf/black" },
    { type: "review", repo: "vercel/next.js" },
  ],
};

describe("computeBadges", () => {
  it("earns contribution milestones", () => {
    const ids = computeBadges(profile).map((b) => b.id);
    expect(ids).toContain("first_pr");
    expect(ids).toContain("contributor_5");
    expect(ids).not.toContain("contributor_20");
  });
  it("earns reviewer, docs and streak badges", () => {
    const ids = computeBadges(profile).map((b) => b.id);
    expect(ids).toContain("reviewer");
    expect(ids).toContain("docs");
    expect(ids).toContain("streak_30");
  });
  it("returns an empty list for a fresh profile", () => {
    expect(
      computeBadges({ stats: { totalMerged: 0, docsMerged: 0, reviews: 0, streak: 0 } })
    ).toEqual([]);
  });
});

describe("countStackContribs", () => {
  it("counts merge/opened contributions for any stack the developer claims", () => {
    // 4 merges across repos; the 4th is `review` so it is excluded.
    expect(countStackContribs(profile, ["Python"])).toBe(4);
  });
  it("limits to contributions in a matching repo name when no language claims hit", () => {
    expect(countStackContribs(profile, ["next"])).toBe(1);
  });
});