import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { fetchProjectPool, fetchIssueList, fetchRepoOverview, fetchRepository } from "../firebase/githubService";
import { computeMatchScore } from "../lib/matchScore";
import {
  fetchSavedProjectIds,
  saveProjectAction,
  createProjectRequest,
  fetchAllMaintainedProjects,
} from "../firebase/db";
import MatchScoreBar from "../components/MatchScoreBar";

const DIFFICULTY_STYLES = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700",
};

export default function ProjectDetail() {
  const { owner, name } = useParams();
  const { user, profile } = useAuth();
  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [guide, setGuide] = useState(null);
  const [actions, setActions] = useState({});
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);

  const id = `${owner}/${name}`;

  useEffect(() => {
    let alive = true;

    async function loadProject() {
      try {
        const [pool, posted] = await Promise.all([
          fetchProjectPool().catch(() => []),
          fetchAllMaintainedProjects().catch(() => []),
        ]);
        if (!alive) return;
        const all = [...pool, ...posted.map((p) => ({ ...p, maintainerPosted: true }))];
        const found = all.find((p) => (p.fullName || p.id) === id);
        if (found) {
          setProject(found);
          return;
        }
        // Live search results and arbitrary slugs aren't in the pool — fetch
        // the repo straight from GitHub so the detail page always resolves.
        try {
          const repo = await fetchRepository(owner, name);
          if (alive) setProject(repo);
        } catch (err) {
          console.error("[devcollab] repo lookup failed", owner, name, err);
        }
      } catch (err) {
        console.error("[devcollab] failed to load project pool", err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadProject();

    if (user) {
      fetchSavedProjectIds(user.uid)
        .then((m) => alive && setActions(m))
        .catch((err) => console.error("[devcollab] failed to load saved actions", err));
    }

    setIssues([]);
    setGuide(null);
    fetchIssueList(id)
      .then((list) => alive && setIssues(list.slice(0, 5)))
      .catch((err) => console.error("[devcollab] failed to load issues", err));
    fetchRepoOverview(owner, name)
      .then((overview) => alive && overview && setGuide(overview.contributingGuide))
      .catch((err) => console.error("[devcollab] failed to load contributing guide", err));

    return () => {
      alive = false;
    };
  }, [id, owner, name, user]);

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

  const match = useMemo(
    () => (project ? computeMatchScore(developer, project, { history: { action: actions[project.id] } }) : null),
    [project, developer, actions]
  );

  async function handleAction(action) {
    if (!user || !project) return;
    setActions((a) => ({ ...a, [project.id]: action }));
    try {
      if (action === "like" && project.maintainerUid) {
        await createProjectRequest(user.uid, project, match?.score || 0);
      }
      await saveProjectAction(user.uid, project.id, action);
    } catch (err) {
      console.error("[devcollab] failed to save action", err);
      setActions((a) => {
        const next = { ...a };
        delete next[project.id];
        return next;
      });
    }
  }

  async function requestToContribute() {
    if (!user || !project) return;
    try {
      await createProjectRequest(user.uid, project, match?.score || 0);
      setRequested(true);
    } catch (err) {
      console.error("[devcollab] failed to send contribution request", err);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center text-slate-500">
        <p className="text-4xl">🌀</p>
        <p className="mt-3 font-medium text-slate-700">Project not found.</p>
        <Link to="/discovery" className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          Back to discovery
        </Link>
      </div>
    );
  }

  const state = user ? actions[project.id] : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/discovery" className="text-sm text-brand-600 hover:underline">
        ← Back to discovery
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-slate-900">
              {project.owner}/{project.name}
            </h1>
            {project.maintainerPosted && (
              <span className="mt-2 inline-block rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-600">
                📣 Maintainer is looking for contributors
              </span>
            )}
            <p className="mt-3 max-w-2xl text-slate-600">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(project.languages || []).map((l) => (
                <span key={l} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">{l}</span>
              ))}
              {(project.frameworks || []).map((f) => (
                <span key={f} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{f}</span>
              ))}
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_STYLES[project.difficulty]}`}>
                {project.difficulty}
              </span>
            </div>
            {project.topics?.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">#{project.topics.slice(0, 8).join(" #")}</p>
            )}
          </div>
          <div className="w-52 shrink-0 rounded-2xl bg-slate-50 p-5">
            {match && <MatchScoreBar score={match.score} />}
            <a
              href={`https://github.com/${project.owner}/${project.name}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-full bg-slate-900 py-2 text-center text-sm font-semibold text-white hover:bg-slate-700"
            >
              Open repo ↗
            </a>
            <div className="mt-4 flex gap-2">
              {user && (
                <>
                  <button
                    onClick={() => handleAction("pass")}
                    className={`flex-1 rounded-full border py-1.5 text-xs font-semibold ${state === "pass" ? "border-slate-900 bg-slate-900 text-white" : "text-slate-500 hover:border-slate-400"}`}
                    title="Not for me"
                  >
                    ⏭
                  </button>
                  <button
                    onClick={() => handleAction("like")}
                    className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${state === "like" ? "bg-accent-500 text-white" : "bg-brand-500 text-white hover:bg-brand-600"}`}
                    title="Save for later"
                  >
                    {state === "like" ? "Liked ♥" : "Like ♥"}
                  </button>
                </>
              )}
              {project.maintainerUid &&
                project.maintainerUid !== user?.uid && (
                <button
                  onClick={requestToContribute}
                  disabled={requested}
                  className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${requested ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
                >
                  {requested ? "Requested ✓" : "Request to contribute"}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">🌱 Good first issues</h2>
          {issues.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No labeled issues right now — check the repo's issues tab or reach out to the maintainer.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {issues.map((i) => (
                <li key={i.number} className="rounded-xl bg-slate-50 px-4 py-3">
                  <a href={i.html_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 hover:text-brand-600">
                    #{i.number} · {i.title}
                  </a>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {i.labels.map((l) => (
                      <span key={l} className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">#{l}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">🧭 Onboarding guide</h2>
          {guide ? (
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              {guide}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No CONTRIBUTING.md detected. Read the README, skim the issues, and open a quick chat with the maintainer.
            </p>
          )}
          <a
            href={`https://github.com/${project.owner}/${project.name}/blob/main/CONTRIBUTING.md`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-xs font-medium text-brand-600 hover:underline"
          >
            Open CONTRIBUTING.md →
          </a>
        </motion.section>
      </div>

      {match && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Why you match</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(match.breakdown).map(([key, b]) => (
              <li key={key} className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{b.score}%</p>
                <p className="mt-1 text-xs text-slate-500">{b.label}</p>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-1">
            {match.reasons.map((r) => (
              <li key={r.label} className="text-sm text-slate-600">→ {r.label}</li>
            ))}
          </ul>
        </motion.section>
      )}
    </div>
  );
}