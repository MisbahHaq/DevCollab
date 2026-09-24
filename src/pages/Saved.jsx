import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchSavedProjectIds,
  saveProjectAction,
  clearProjectAction,
  fetchAllMaintainedProjects,
} from "../firebase/db";
import { fetchProjectPool } from "../firebase/githubService";
import { mockProjects } from "../data/mockProjects";
import { computeMatchScore } from "../lib/matchScore";
import ProjectCard from "../components/ProjectCard";

export default function Saved() {
  const { user, profile } = useAuth();
  const [actions, setActions] = useState({});
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("bookmark");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const poolData = await fetchProjectPool().catch(() => []);
        const posted = await fetchAllMaintainedProjects().catch(() => []);
        if (!alive) return;
        const known = new Set(poolData.map((p) => p.id));
        const merged = [...poolData];
        posted.forEach((p) => {
          if (!known.has(p.id)) merged.push({ ...p, maintainerPosted: true });
        });
        setPool(merged.length ? merged : mockProjects);
      } catch {
        if (alive) setPool(mockProjects);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    fetchSavedProjectIds(user.uid).then((m) => alive && setActions(m)).catch(() => {});
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

  const savedList = useMemo(() => {
    const ids = new Set(
      Object.entries(actions)
        .filter(([, a]) => a === tab)
        .map(([id]) => id)
    );
    return pool
      .filter((p) => ids.has(p.id))
      .map((p) => ({
        ...p,
        match: computeMatchScore(developer, p, { history: { action: actions[p.id] } }),
      }));
  }, [pool, actions, developer, tab]);

  async function toggle(project, action) {
    const prev = actions[project.id];
    const isActive = prev === action;
    setActions((a) => ({ ...a, [project.id]: isActive ? null : action }));
    try {
      if (isActive) await clearProjectAction(user.uid, project.id);
      else await saveProjectAction(user.uid, project.id, action);
    } catch {
      setActions((a) => ({ ...a, [project.id]: prev }));
    }
  }

  const counts = {
    bookmark: Object.values(actions).filter((a) => a === "bookmark").length,
    like: Object.values(actions).filter((a) => a === "like").length,
  };
  const total = counts.bookmark + counts.like;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading-brutal text-4xl text-ink">Saved & liked</h1>
          <p className="mt-2 font-medium text-ink/60">
            Your shortlists persist to your account — revisit them whenever.
          </p>
        </div>
        <span className="badge-brutal bg-canary-soft px-3 py-1 text-[11px] text-ink">
          {total} saved
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {[
            { id: "bookmark", label: `⭐ Bookmarked (${counts.bookmark})` },
            { id: "like", label: `♥ Liked (${counts.like})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn-brutal rounded-none px-4 py-2 ${
                tab === t.id ? "bg-ink text-canvas" : "bg-white text-ink hover:bg-canary-soft"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link to="/discovery" className="btn-brutal rounded-none bg-mint px-4 py-2 text-ink hover:bg-mint">
          + Find more
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="brutal animate-pulse bg-white p-5">
              <div className="h-10 w-10 border-2 border-ink bg-canvas" />
              <div className="mt-4 h-4 w-2/3 border-2 border-ink bg-canvas" />
              <div className="mt-2 h-3 w-full border-2 border-ink bg-canvas" />
            </div>
          ))}
        </div>
      ) : savedList.length > 0 ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {savedList.map((p) => (
            <ProjectCard key={p.id} project={p} match={p.match} actions={actions} onAction={toggle} />
          ))}
        </div>
      ) : (
        <div className="brutal mt-10 bg-white p-10 text-center">
          <p className="text-4xl">{tab === "bookmark" ? "⭐" : "♥"}</p>
          <p className="mt-4 font-extrabold uppercase tracking-tight text-ink">
            Nothing {tab === "bookmark" ? "bookmarked" : "liked"} yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            Hit ☆ on a project in Discovery to shortlist it here, or ♥ to tell the maintainer
            you're interested.
          </p>
          <Link to="/discovery" className="btn-brutal mt-6 inline-block bg-canary px-6 py-2.5 text-ink hover:bg-canary">
            Go to discovery
          </Link>
        </div>
      )}
    </div>
  );
}