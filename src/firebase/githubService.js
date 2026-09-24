// GitHub REST API integration. Reads a token from localStorage when the
// user pasted a Personal Access Token in settings, otherwise hits the
// public API (rate-limited to 60 req/hr/IP). For production scale, set
// VITE_GITHUB_PROXY_URL to a server-side GitHub proxy (`functions/api`) so
// the PAT never ships to the browser and rate limits are shared.

const API = "https://api.github.com";
const PROXY = import.meta.env.VITE_GITHUB_PROXY_URL;
const TOKEN_KEY = "devcollab_github_token";

export function setGitHubToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  GH_CACHE.clear(); // a token changes auth headers, so stale (403-cached) data is irrelevant
}

export function getGitHubToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function gh(path) {
  const token = getGitHubToken();
  const isProxy = Boolean(PROXY);
  const res = await fetch(isProxy ? `${PROXY}?path=${encodeURIComponent(path)}` : `${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(!isProxy && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const msg = res.status === 403
      ? "GitHub API rate limit hit. Add a personal access token in Settings to refresh."
      : `GitHub API error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// In-memory response cache (promise-level, so in-flight requests are deduped).
// Repeated identical GETs — e.g. ProjectDetail firing repo + issues + guide
// for the same slug under StrictMode remounts — resolve without a second
// network round-trip, which keeps the unauth rate limit from evaporating.
const GH_CACHE = new Map(); // path -> { promise, at, ok }
const MAX_CACHE_ENTRIES = 200;
const ERROR_TTL_MS = 15 * 1000;

function ghCached(path, ttlMs = 10 * 60 * 1000) {
  const hit = GH_CACHE.get(path);
  if (hit) {
    const ttl = hit.ok ? ttlMs : ERROR_TTL_MS;
    if (Date.now() - hit.at < ttl) return hit.promise;
    GH_CACHE.delete(path);
  }

  // Never delete on failure: negative results (404 missing CONTRIBUTING.md,
  // 403 rate limit) are cached briefly so we don't hammer the API in a loop.
  const promise = gh(path);
  GH_CACHE.set(path, { promise, at: Date.now(), ok: true });
  promise.catch(() => {
    GH_CACHE.get(path)?.at && (GH_CACHE.get(path).ok = false);
  });

  if (GH_CACHE.size > MAX_CACHE_ENTRIES) {
    const oldest = GH_CACHE.entries().next().value;
    if (oldest) GH_CACHE.delete(oldest[0]);
  }
  return promise;
}

export async function fetchUserProfile(username) {
  const user = await gh(`/users/${username}`);

  const [repoRes] = await Promise.all([
    gh(`/users/${username}/repos?per_page=100&sort=updated`),
  ]);

  const repos = repoRes.filter((r) => !r.fork);
  const languages = {};
  repos.forEach((r) => {
    if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;
  });

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    username: user.login,
    displayName: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    location: user.location,
    url: user.html_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    createdAt: user.created_at,
    repoCount: repos.length,
    topLanguages: topLanguages.map(([name]) => name),
    languageBreakdown: topLanguages.reduce((acc, [name, count]) => {
      acc[name] = count;
      return acc;
    }, {}),
  };
}

export async function fetchContributionStreak(username) {
  // Uses the public contributions endpoint (GitHub GraphQL requires a
  // token). Falls back to a rough estimate from recent activity.
  const events = await gh(`/users/${username}/events/public?per_page=100`);
  const dates = new Set(
    events.map((e) => e.created_at?.slice(0, 10)).filter(Boolean)
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
    } else if (i !== 0) {
      break;
    }
  }
  return streak;
}

export async function fetchIssueList(repo, label = "good first issue") {
  const [owner, name] = repo.split("/");
  const issues = await ghCached(
    `/repos/${owner}/${name}/issues?state=open&labels=${encodeURIComponent(label)}&per_page=30`,
    5 * 60 * 1000
  );
  return issues
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      html_url: i.html_url,
      labels: i.labels.map((l) => l.name),
      created_at: i.created_at,
    }));
}

export async function fetchUserEvents(username, perPage = 100) {
  const events = await ghCached(`/users/${username}/events/public?per_page=${perPage}`, 2 * 60 * 1000);
  return events.map((e) => ({
    id: e.id,
    type: e.type,
    repo: e.repo?.name || "",
    created_at: e.created_at,
    payload: e.payload,
  }));
}

export async function fetchRepoOverview(owner, name) {
  const [repoRes, contRes] = await Promise.all([
    ghCached(`/repos/${owner}/${name}`, 10 * 60 * 1000),
    ghCached(`/repos/${owner}/${name}/contents/CONTRIBUTING.md`, 10 * 60 * 1000).catch(() => null),
  ]);
  return {
    ...toProjectModel(repoRes),
    contributingGuide: contRes ? atob(contRes.content).slice(0, 2000) : null,
  };
}

// Frameworks/topics parsed from a repo's GitHub topics into display names.
const FRAMEWORK_TOPICS = new Set([
  "react", "reactjs", "vue", "vuejs", "angular", "svelte", "nextjs", "next",
  "tailwindcss", "tailwind", "nodejs", "node", "express", "django", "rails",
  "laravel", "spring", "spring-boot", "flutter", "deno", "fastapi", "flask",
  "graphql", "react-native", "sveltekit", "remix", "astro", "nuxt", "gatsby",
]);

const LANGUAGE_TOPICS = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  ruby: "Ruby",
  php: "PHP",
  kotlin: "Kotlin",
  swift: "Swift",
  csharp: "C#",
  scala: "Scala",
};

// Live free-text project search against the GitHub Search API. Powers the
// navbar + discovery search boxes. Tokens are quoted so user input can't
// inject search qualifiers. Falls back to good-first-issue repos when no
// query is given.
export async function searchGitHubProjects(query, { perPage = 30, language, size } = {}) {
  const tokens = query ? query.trim().split(/\s+/).filter(Boolean).map((t) => `"${t}"`) : [];
  const parts = [
    tokens.length ? tokens.join(" ") : "topic:good-first-issue",
    "fork:false",
    "archived:false",
    "pushed:>2026-06-01",
  ];
  if (language) parts.push(`language:${language}`);
  if (size === "small") parts.push("stars:<200");
  else if (size === "medium") parts.push("stars:200..2000");
  else if (size === "large") parts.push("stars:>2000");

  const data = await ghCached(
    `/search/repositories?q=${encodeURIComponent(parts.join(" "))}&sort=stars&order=desc&per_page=${perPage}`,
    60 * 1000
  );
  return data.items.map(toProjectModel);
}

// Fetches a single repo by owner/name and maps it to the project model. Used
// by ProjectDetail so live search results and arbitrary slugs always resolve.
export async function fetchRepository(owner, name) {
  const repo = await ghCached(`/repos/${owner}/${name}`, 10 * 60 * 1000);
  return toProjectModel(repo);
}

const POOL_KEY = "devcollab_project_pool";

let poolPromise = null;

// Fetches a broad pool of real, currently-active open source projects and
// caches it so the discovery feed filters/sorts instantly. Call this early
// (e.g. app boot) so the feed mounts with data already resolved. Returns
// page 1 (~100 projects) for first paint; page 2 merges in the background.
export function fetchProjectPool({ perPage = 100 } = {}) {
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    const cached = sessionStorage.getItem(POOL_KEY);
    if (cached) return JSON.parse(cached);

    const q = "topic:good-first-issue fork:false archived:false pushed:>2026-06-01";
    const url = (page) =>
      `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;

    const firstPage = await ghCached(url(1), 10 * 60 * 1000).then((d) => d.items.map(toProjectModel));
    storePool(firstPage);
    enrichPoolCache(url(2));
    return firstPage;
  })().catch((err) => {
    poolPromise = null;
    throw err;
  });

  return poolPromise;
}

async function enrichPoolCache(url) {
  try {
    const page2 = await ghCached(url, 10 * 60 * 1000);
    const models = page2.items.map(toProjectModel);
    let existing = [];
    try {
      existing = JSON.parse(sessionStorage.getItem(POOL_KEY) || "[]");
    } catch {
      existing = [];
    }
    const known = new Set(existing.map((p) => p.id));
    storePool([...existing, ...models.filter((m) => !known.has(m.id))]);
  } catch {
    // background enrichment is best-effort
  }
}

function storePool(pool) {
  try {
    sessionStorage.setItem(POOL_KEY, JSON.stringify(pool));
  } catch {
    // pool still works in memory
  }
}

function toProjectModel(repo) {
  const topics = repo.topics || [];
  const languages = new Set(repo.language ? [repo.language] : []);
  const frameworks = [];
  const stars = repo.stargazers_count || 0;

  topics.forEach((t) => {
    if (FRAMEWORK_TOPICS.has(t)) frameworks.push(toDisplay(t));
    if (LANGUAGE_TOPICS[t]) languages.add(LANGUAGE_TOPICS[t]);
  });

  const difficulty = estimateDifficulty(repo);

  return {
    id: `${repo.owner?.login}/${repo.name}`,
    owner: repo.owner?.login || "unknown",
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    htmlUrl: repo.html_url,
    languages: [...languages],
    frameworks: [...new Set(frameworks)],
    difficulty,
    size: stars > 2000 ? "large" : stars >= 200 ? "medium" : "small",
    stars,
    openIssues: repo.open_issues_count || 0,
    forks: repo.forks_count || 0,
    hasGoodFirstIssues: true,
    lastActivity: repo.pushed_at,
    topics,
    sizeRepository: repo.size || 0,
    estimatedFirstContribution: { easy: "1–3 hours", medium: "4–8 hours", hard: "1–2 days" }[difficulty],
  };
}

// Heuristic: repo disk size (KB) as a proxy for codebase complexity.
function estimateDifficulty(repo) {
  const kb = repo.size || 0;
  if (kb > 0 && kb < 1000) return "easy";
  if (kb < 10000) return "medium";
  return "hard";
}

function toDisplay(topic) {
  return topic === "next" || topic === "nextjs" || topic === "reactjs" || topic === "vuejs"
    ? topic.replace("js", "").replace("next", "Next.js")
    : topic === "tailwindcss"
      ? "TailwindCSS"
      : topic === "spring-boot"
        ? "Spring Boot"
        : topic
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
}