import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { fetchProjectPool, searchGitHubProjects } from "../firebase/githubService";
import { mockProjects } from "../data/mockProjects";
import {
  fetchSavedProjectIds,
  saveProjectAction,
  createProjectRequest,
  fetchAllMaintainedProjects,
  persistTopMatches,
} from "../firebase/db";
import { computeMatchScore } from "../lib/matchScore";
import { projectMatchesQuery } from "../lib/search";
import ProjectCard from "../components/ProjectCard";
import Filters from "../components/Filters";

const SORTERS = {
  match: (a, b) => b.match.score - a.match.score,
  stars: (a, b) => b.stars - a.stars,
  activity: (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity),
  issues: (a, b) => b.openIssues - a.openIssues,
};

export default function Discovery() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ language: "", difficulty: "", size: "", sort: "match", query: searchParams.get("q") || "" });
  const [pool, setPool] = useState([]);
  const [actions, setActions] = useState({});
  const [tab, setTab] = useState("for-you");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchProjectPool()
      .then((repos) => {
        if (!alive) return;
        setPool(repos);
        setLive(true);
        setError("");
        return fetchAllMaintainedProjects().catch(() => []);
      })
      .then((posted) => {
        if (!alive || !posted?.length) return;
        setPool((prev) => {
          const known = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          posted.forEach((p) => {
            if (!known.has(p.id)) {
              merged.push({ ...p, maintainerPosted: true });
              known.add(p.id);
            }
          });
          return merged;
        });
      })
      .catch(() => {
        if (!alive) return;
        setLive(false);
        setError("Live GitHub data unavailable — showing seed projects.");
      })
      .finally(() => alive && setLoading(false));

    if (user) {
      fetchSavedProjectIds(user.uid)
        .then((m) => alive && setActions(m))
        .catch(() => {});
    }

    return () => {
      alive = false;
    };
  }, [user]);

  // Keep the query filter in sync with ?q= (navbar search lands here live)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null) setFilters((f) => ({ ...f, query: q }));
  }, [searchParams]);

  // Debounced live GitHub search while a keyword is active.
  useEffect(() => {
    const q = filters.query?.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchGitHubProjects(q, { perPage: 24, language: filters.language || undefined, size: filters.size || undefined })
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [filters.query, filters.language, filters.size]);

  const developer = useMemo(
    () => ({
      primaryLanguage: profile?.primaryLanguage,
      languages: profile?.languages || [],
      level: profile?.level || "beginner",
      goals: profile?.goals || "",
      stats: profile?.stats,
      interests: profile?.interests || [],
    }),
    [profile]
  );

  const allProjects = useMemo(() => {
    const base = pool.length ? pool : mockProjects;
    // Live GitHub search results take precedence; dedupe on repo id.
    const seen = new Set();
    const source = [...searchResults, ...base].filter(
      (p) => (seen.has(p.id) ? false : (seen.add(p.id), true))
    );
    return source.map((p) => ({
      ...p,
      match: computeMatchScore(developer, p, { history: { action: actions[p.id] } }),
    }));
  }, [pool, developer, actions, searchResults]);

  // Persist the top matches to Firestore so the dashboard feed is real.
  // Debounced + idempotent: projects already scored are skipped.
  useEffect(() => {
    if (!user || !profile?.onboardingComplete || !allProjects.length) return;
    const id = setTimeout(() => {
      persistTopMatches(user.uid, allProjects, { limit: 10 })
        .catch((err) => console.error("[devcollab] failed to persist matches", err));
    }, 800);
    return () => clearTimeout(id);
  }, [user, profile, allProjects]);

  const projects = useMemo(() => {
    let list = allProjects;

    if (tab === "liked") {
      list = list.filter((p) => actions[p.id] === "like");
    } else if (tab === "passed") {
      list = list.filter((p) => actions[p.id] === "pass");
    } else if (tab === "saved") {
      list = list.filter((p) => actions[p.id] === "bookmark");
    }

    if (filters.language) list = list.filter((p) => (p.languages || []).includes(filters.language));
    if (filters.difficulty) list = list.filter((p) => p.difficulty === filters.difficulty);
    if (filters.size) list = list.filter((p) => p.size === filters.size);
    if (filters.query) {
      list = list.filter((p) => {
        // Live GitHub search results already matched the query — keep them as-is.
        if (searchResults.some((s) => s.id === p.id)) return true;
        return projectMatchesQuery(p, filters.query);
      });
    }

    return [...list].sort(SORTERS[filters.sort] || SORTERS.match);
  }, [allProjects, filters, tab, actions, searchResults]);

  async function handleAction(project, action) {
    if (!user) return;
    const prev = actions[project.id];
    setActions((a) => ({ ...a, [project.id]: action }));
    if (action === "like" && project.maintainerUid) {
      try {
        await createProjectRequest(user.uid, project, project.match?.score || 0);
      } catch {}
    }
    try {
      await saveProjectAction(user.uid, project.id, action);
    } catch {
      setActions((a) => ({ ...a, [project.id]: prev }));
    }
  }

  const tabs = [
    { id: "for-you", label: "For you" },
    { id: "saved", label: "⭐ Saved", count: Object.values(actions).filter((a) => a === "bookmark").length },
    { id: "liked", label: "Liked ♥", count: Object.values(actions).filter((a) => a === "like").length },
    { id: "passed", label: "Passed" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading-brutal text-4xl text-ink">Discovery feed</h1>
          <p className="mt-2 font-medium text-ink/60">
            Star a project to shortlist it, ♥ to tell the maintainer you're interested, pass to
            train your matches.
          </p>
        </div>
        <span
          className={`badge-brutal px-3 py-1 text-[11px] ${
            live ? "bg-mint text-ink" : "bg-canary-soft text-ink"
          }`}
        >
          {loading ? "…" : live ? "● Live GitHub data" : "● Seed data"}
        </span>
      </div>

      {error && (
        <p className="mt-4 inline-block border-2 border-ink bg-coral px-4 py-2 font-mono text-xs font-bold text-ink">
          {error}
        </p>
      )}

      {filters.query && (
        <p className="mt-4 inline-block border-2 border-ink bg-canary-soft px-4 py-2 font-mono text-xs font-bold text-ink">
          🔎 {projects.length} result{projects.length === 1 ? "" : "s"} for "{filters.query}"
          {searching ? <span className="ml-2 text-ink/50">· searching GitHub…</span> : null}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn-brutal rounded-none px-4 py-2 ${
                tab === t.id ? "bg-ink text-canvas" : "bg-white text-ink hover:bg-canary-soft"
              }`}
            >
              {t.label}
              {t.count ? <span className="ml-1 font-mono">{t.count}</span> : null}
            </button>
          ))}
        </div>
        <Filters query={filters.query} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="brutal animate-pulse bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-ink bg-canvas" />
                <div className="h-4 w-40 border-2 border-ink bg-canvas" />
              </div>
              <div className="mt-4 h-3 w-full border-2 border-ink bg-canvas/60" />
              <div className="mt-2 h-3 w-2/3 border-2 border-ink bg-canvas/60" />
            </div>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <motion.div layout className="mt-6 grid gap-5 lg:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              match={p.match}
              actions={actions}
              onAction={handleAction}
            />
          ))}
        </motion.div>
      ) : (
        <div className="brutal mt-10 bg-white p-10 text-center text-ink">
          <p className="text-4xl">{tab === "liked" ? "💜" : tab === "saved" ? "⭐" : filters.query ? "🔎" : "🔍"}</p>
          <p className="mt-3 font-extrabold uppercase tracking-tight">
            {tab === "liked"
              ? "Nothing liked yet — hit ♥ on a project."
              : tab === "saved"
                ? "Nothing saved yet — hit ☆ on a project."
                : tab === "passed"
                  ? "No passed projects yet."
                  : filters.query
                    ? `No results for "${filters.query}"`
                    : "No projects match those filters."}
          </p>
          <p className="mt-1 text-sm text-ink/60">
            {filters.query
              ? "Try a language, framework, or topic — e.g. \"react\", \"python\", \"rust\"."
              : "Try clearing the language or difficulty filter."}
          </p>
          {filters.query && (
            <button
              onClick={() => setFilters((f) => ({ ...f, query: "" }))}
              className="btn-brutal mt-5 inline-block rounded-none bg-coral px-5 py-2 text-ink hover:bg-coral"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}