import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { fetchProjectPool } from "../firebase/githubService";
import { mockProjects } from "../data/mockProjects";
import {
  fetchSavedProjectIds,
  saveProjectAction,
  createProjectRequest,
  fetchAllMaintainedProjects,
} from "../firebase/db";
import { computeMatchScore } from "../lib/matchScore";
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
  const [filters, setFilters] = useState({ language: "", difficulty: "", size: "", sort: "match" });
  const [pool, setPool] = useState([]);
  const [actions, setActions] = useState({});
  const [tab, setTab] = useState("for-you");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

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
    const source = pool.length ? pool : mockProjects;
    return source.map((p) => ({
      ...p,
      match: computeMatchScore(developer, p, { history: { action: actions[p.id] } }),
    }));
  }, [pool, developer, actions]);

  const projects = useMemo(() => {
    let list = allProjects;

    if (tab === "liked") {
      list = list.filter((p) => actions[p.id] === "like");
    } else if (tab === "passed") {
      list = list.filter((p) => actions[p.id] === "pass");
    }

    if (filters.language) list = list.filter((p) => (p.languages || []).includes(filters.language));
    if (filters.difficulty) list = list.filter((p) => p.difficulty === filters.difficulty);
    if (filters.size) list = list.filter((p) => p.size === filters.size);

    return [...list].sort(SORTERS[filters.sort] || SORTERS.match);
  }, [allProjects, filters, tab, actions]);

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
    { id: "liked", label: "Liked ♥", count: Object.values(actions).filter((a) => a === "like").length },
    { id: "passed", label: "Passed" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Discovery feed</h1>
          <p className="mt-1 text-slate-600">
            Like projects to save them, pass to train your matches. Real repos with good first issues.
          </p>
        </div>
        <span
          className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-block ${
            live ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {loading ? "…" : live ? "● Live GitHub data" : "● Seed data"}
        </span>
      </div>

      {error && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {t.label}
              {t.count ? <span className="ml-1 opacity-70">{t.count}</span> : null}
            </button>
          ))}
        </div>
        <Filters onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-200" />
              </div>
              <div className="mt-4 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
              <div className="mt-4 h-6 w-28 rounded-full bg-slate-200" />
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
        <div className="mt-16 text-center text-slate-500">
          <p className="text-4xl">{tab === "liked" ? "💜" : "🔍"}</p>
          <p className="mt-3 font-medium">
            {tab === "liked"
              ? "Nothing liked yet — hit ♥ on a project to save it here."
              : tab === "passed"
                ? "No passed projects yet."
                : "No projects match those filters."}
          </p>
          <p className="text-sm">Try clearing the language or difficulty filter.</p>
        </div>
      )}
    </div>
  );
}