// Adaptive weighted match scoring between a developer profile and a project.
//
// Base weights:
//   primary language match          40%
//   secondary / framework overlap   25%
//   contribution history            20%
//   experience/goal alignment       15%
//
// Adaptive adjustments:
//   + interest/topic overlap (from onboarding interests × project topics)
//   + contribution boost (weight grows as the developer ships real work)
//   - passed projects are downweighted so the feed keeps teaching the model

export const MATCH_WEIGHTS = {
  language: 0.4,
  framework: 0.25,
  contributionHistory: 0.2,
  experience: 0.15,
};

const INTEREST_TOPIC_ALIASES = {
  frontend: ["react", "ui", "web", "css", "design-system", "tailwind"],
  backend: ["api", "database", "server", "rest", "grpc"],
  mobile: ["ios", "android", "flutter", "react-native", "kotlin", "swift"],
  devops: ["docker", "kubernetes", "terraform", "ci", "observability", "monitoring"],
  ai: ["machine-learning", "llm", "ai", "transformers", "nlp", "data"],
  data: ["database", "sql", "analytics", "data"],
  docs: ["documentation", "markdown", "education"],
  testing: ["testing", "qa", "e2e", "jest"],
  security: ["security", "auth", "privacy", "encryption"],
};

export function computeMatchScore(developer, project, options = {}) {
  const devLanguages = new Set(
    [developer.primaryLanguage, ...(developer.languages || [])].filter(Boolean)
  );
  const projLanguages = new Set(project.languages || []);
  const projFrameworks = new Set(project.frameworks || []);
  const projTopics = new Set(project.topics || []);

  let languageScore = 0;
  if (developer.primaryLanguage && projLanguages.has(developer.primaryLanguage)) {
    languageScore = 1;
  } else {
    const overlap = [...devLanguages].filter((l) => projLanguages.has(l)).length;
    languageScore = Math.min(overlap / Math.max(projLanguages.size, 1), 1) * 0.6;
  }

  let frameworkScore = 0;
  if (projFrameworks.size > 0) {
    const overlap = [...devLanguages].filter((l) => projFrameworks.has(l)).length;
    frameworkScore = Math.min(overlap / projFrameworks.size, 1);
  } else {
    frameworkScore = 0.5;
  }

  const merged = (developer.stats?.totalMerged || 0) + (developer.stats?.totalOpened || 0) || 0;
  let contributionScore = 0;
  if (merged > 0) {
    contributionScore = Math.min(merged / 20, 1);
  } else {
    contributionScore = developer.level === "beginner" ? 1 : 0.35;
  }

  let experienceScore = 0;
  const levels = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 };
  const diff = { easy: 0, medium: 1, hard: 2 };
  if (project.difficulty && developer.level) {
    experienceScore = 1 - Math.abs(levels[developer.level] - diff[project.difficulty]) / 3;
  } else {
    experienceScore = 0.5;
  }

  let intererestScore = 0;
  if (developer.interests?.length) {
    const aliases = new Set();
    developer.interests.forEach((i) => {
      const key = (i || "").toLowerCase();
      if (INTEREST_TOPIC_ALIASES[key]) aliases.add(key);
      INTEREST_TOPIC_ALIASES[key]?.forEach((a) => aliases.add(a));
    });
    const matched = [...projTopics].filter((t) =>
      aliases.has(t.toLowerCase()) || developer.interests.some((i) => i.toLowerCase() === t.toLowerCase())
    ).length;
    intererestScore = projTopics.size ? Math.min(matched / Math.min(projTopics.size, 4), 1) : 0.5;
  } else {
    intererestScore = 0.5;
  }

  let weighted =
    languageScore * MATCH_WEIGHTS.language +
    frameworkScore * MATCH_WEIGHTS.framework +
    contributionScore * MATCH_WEIGHTS.contributionHistory +
    experienceScore * MATCH_WEIGHTS.experience;

  // Adaptive: interests reinforce a believable score between 0 and 1 additively.
  const interestBoost = intererestScore * 0.06;

  // Adaptive: the more real work someone ships, the more we trust language/stack scores.
  const trustBoost = contributionScore >= 0.5 ? 0.04 : 0;

  // Adaptive: passing a project teaches the model — nudge it down.
  const passPenalty = options.history?.action === "pass" ? 0.08 : 0;
  const likeBonus = options.history?.action === "like" ? 0.02 : 0;

  const score = Math.round(
    Math.min(1, weighted + interestBoost + trustBoost + likeBonus - passPenalty) * 100
  );

  const reasons = [];

  if (languageScore >= 0.9) {
    reasons.push({ label: "Native language match", weight: 40 });
  } else if (languageScore > 0) {
    reasons.push({ label: "Related stack overlap", weight: 24 });
  } else {
    reasons.push({ label: "New language — high learning value", weight: 18 });
  }

  if (frameworkScore >= 0.75) {
    reasons.push({ label: "Framework expertise lines up", weight: 25 });
  } else if (frameworkScore >= 0.5) {
    reasons.push({ label: "Familiar ecosystem", weight: 18 });
  }

  if (intererestScore >= 0.9) {
    reasons.push({ label: "Matches your stated interests", weight: 6 });
  } else if (intererestScore > 0.5) {
    reasons.push({ label: "Partially in your interest zone", weight: 4 });
  }

  if (project.hasGoodFirstIssues) {
    reasons.push({ label: "Good first issues available", weight: 12 });
  }
  if (developer.goals) {
    reasons.push({ label: `Goal: ${developer.goals}`, weight: 10 });
  }
  if (trustBoost > 0) {
    reasons.push({ label: "Proven contributor — stack trust", weight: 4 });
  }

  return {
    score,
    languageScore: Math.round(languageScore * 100),
    frameworkScore: Math.round(frameworkScore * 100),
    contributionScore: Math.round(contributionScore * 100),
    experienceScore: Math.round(experienceScore * 100),
    interestScore: Math.round(intererestScore * 100),
    reasons,
    breakdown: {
      language: { label: "Primary language", score: Math.round(languageScore * 100) },
      framework: { label: "Framework overlap", score: Math.round(frameworkScore * 100) },
      contributionHistory: { label: "Contribution history", score: Math.round(contributionScore * 100) },
      experience: { label: "Experience fit", score: Math.round(experienceScore * 100) },
      interests: { label: "Interest alignment", score: Math.round(intererestScore * 100) },
    },
  };
}

export function matchTier(score) {
  if (score >= 80) return { label: "Excellent", color: "#10b981" };
  if (score >= 60) return { label: "Great", color: "#22c55e" };
  if (score >= 40) return { label: "Good", color: "#eab308" };
  return { label: "Explore", color: "#94a3b8" };
}