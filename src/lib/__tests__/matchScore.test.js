import { describe, it, expect } from "vitest";
import { computeMatchScore, matchTier } from "../matchScore.js";

const reactDeveloper = {
  primaryLanguage: "TypeScript",
  languages: ["TypeScript", "JavaScript"],
  level: "intermediate",
  goals: "Ship a first PR",
  interests: ["frontend"],
  stats: { totalMerged: 3, totalOpened: 5, reviews: 2, docsMerged: 0, streak: 4 },
};

const reactProject = {
  owner: "vercel",
  name: "next.js",
  languages: ["TypeScript", "JavaScript"],
  frameworks: ["React"],
  topics: ["nextjs", "react"],
  difficulty: "medium",
  hasGoodFirstIssues: true,
};

describe("computeMatchScore", () => {
  it("scores native-stack repos in the Great tier or better", () => {
    const { score } = computeMatchScore(reactDeveloper, reactProject);
    expect(score).toBeGreaterThanOrEqual(60);
    expect(matchTier(score).label).toBe("Great");
  });

  it("scores a mismatched stack lower", () => {
    const rustOnly = { ...reactDeveloper, primaryLanguage: "Rust", languages: ["Rust"] };
    const low = computeMatchScore(rustOnly, reactProject).score;
    const native = computeMatchScore(reactDeveloper, reactProject).score;
    expect(low).toBeLessThan(native);
  });

  it("penalizes projects you already passed", () => {
    const base = computeMatchScore(reactDeveloper, reactProject).score;
    const passed = computeMatchScore(reactDeveloper, reactProject, {
      history: { action: "pass" },
    }).score;
    expect(passed).toBeLessThan(base);
  });

  it("rewards a liked project slightly", () => {
    const base = computeMatchScore(reactDeveloper, reactProject).score;
    const liked = computeMatchScore(reactDeveloper, reactProject, {
      history: { action: "like" },
    }).score;
    expect(liked).toBeGreaterThanOrEqual(base);
  });

  it("returns a breakdown with the four weighted dimensions", () => {
    const { breakdown } = computeMatchScore(reactDeveloper, reactProject);
    expect(Object.keys(breakdown)).toEqual(
      expect.arrayContaining(["language", "framework", "contributionHistory", "experience"])
    );
  });

  it("always returns reasons", () => {
    const { reasons } = computeMatchScore(reactDeveloper, reactProject);
    expect(reasons.length).toBeGreaterThan(0);
  });
});

describe("matchTier", () => {
  it("labels excellent/explore bands", () => {
    expect(matchTier(90).label).toBe("Excellent");
    expect(matchTier(10).label).toBe("Explore");
  });
});