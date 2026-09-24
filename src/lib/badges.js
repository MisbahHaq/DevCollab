// Verified badge engine. Badges are computed from real, logged contributions
// plus profile signals, then persisted onto the user's profile so they're
// shareable on the portfolio and linked to their socials.

export const BADGE_DEFINITIONS = [
  {
    id: "first_pr",
    name: "First PR",
    emoji: "🌱",
    description: "Merged your first pull request",
    test: (p) => (p.stats?.totalMerged || 0) >= 1,
  },
  {
    id: "contributor_5",
    name: "5× Contributor",
    emoji: "🔥",
    description: "5 merged PRs across any projects",
    test: (p) => (p.stats?.totalMerged || 0) >= 5,
  },
  {
    id: "contributor_20",
    name: "Heavy Hitter",
    emoji: "⚡",
    description: "20 merged PRs across any projects",
    test: (p) => (p.stats?.totalMerged || 0) >= 20,
  },
  {
    id: "reviewer",
    name: "Squad Reviewer",
    emoji: "🔎",
    description: "Reviewed 5+ pull requests",
    test: (p) => (p.stats?.reviews || 0) >= 5,
  },
  {
    id: "react",
    name: "React Contributor",
    emoji: "⚛️",
    description: "Shipped work in a React/TypeScript repo",
    test: (p) => countStackContribs(p, ["React", "TypeScript", "JavaScript"]) >= 3,
  },
  {
    id: "rust",
    name: "Rust, but make it useful",
    emoji: "🦀",
    description: "Contributed to a Rust project",
    test: (p) => countStackContribs(p, ["Rust"]) >= 1,
  },
  {
    id: "python",
    name: "Pythonic",
    emoji: "🐍",
    description: "Contributed to a Python project",
    test: (p) => countStackContribs(p, ["Python"]) >= 1,
  },
  {
    id: "docs",
    name: "Documentation Hero",
    emoji: "📝",
    description: "Docs or non-code contributions merged",
    test: (p) => (p.stats?.docsMerged || 0) >= 2,
  },
  {
    id: "mentor",
    name: "Open Source Mentor",
    emoji: "🧭",
    description: "Listed as a mentor for other contributors",
    test: (p) => Boolean(p.mentor?.available),
  },
  {
    id: "maintainer",
    name: "Maintainer",
    emoji: "🏗️",
    description: "Registered a repository on DevCollab",
    test: (p) => Boolean(p.maintainer?.registered),
  },
  {
    id: "streak_30",
    name: "30-Day Streak",
    emoji: "📆",
    description: "Contributed on 30+ distinct days",
    test: (p) => (p.stats?.streak || 0) >= 30,
  },
];

export function countStackContribs(profile, stacks) {
  const contribs = profile.contributions || [];
  const langs = profile.languages || [];
  const primary = profile.primaryLanguage || "";
  return contribs.filter((c) => {
    const repo = (c.repo || "").toLowerCase();
    const stackHit = stacks.some((s) => {
      const name = s.toLowerCase();
      return (
        langs.some((l) => l.toLowerCase() === name) ||
        primary.toLowerCase() === name ||
        repo.includes(name)
      );
    });
    return stackHit && (c.type === "merge" || c.type === "opened");
  }).length;
}

export function computeBadges(profile) {
  return BADGE_DEFINITIONS.filter((b) => b.test(profile)).map((b) => ({
    id: b.id,
    name: b.name,
    emoji: b.emoji,
    description: b.description,
  }));
}