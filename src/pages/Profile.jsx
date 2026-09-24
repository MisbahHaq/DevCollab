import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { fetchRecentContributions, syncContributions } from "../firebase/db";
import { fetchUserEvents, setGitHubToken, getGitHubToken } from "../firebase/githubService";
import { BASE_STATS } from "../lib/stats";

const MONTHLY_GOAL = 5;

const TYPE_STYLES = {
  merge: "bg-mint",
  review: "bg-skyish",
  docs: "bg-lava",
  opened: "bg-canary-soft",
};

export default function Profile() {
  const { user, profile, mergeContributions } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    let alive = true;
    if (user) {
      fetchRecentContributions(user.uid)
        .then((c) => alive && setContributions(c))
        .catch(() => alive && setContributions([]));
    }
    return () => {
      alive = false;
    };
  }, [user]);

  async function handleSync() {
    if (!profile?.githubUsername) {
      setSyncMsg("Add a GitHub username in onboarding first.");
      return;
    }
    setSyncing(true);
    setSyncMsg("");
    try {
      const events = await fetchUserEvents(profile.githubUsername, 100);
      const written = await syncContributions(user.uid, events);
      const fresh = await fetchRecentContributions(user.uid, 200);
      mergeContributions(fresh);
      setContributions(fresh);
      setSyncMsg(written > 0 ? `Synced ${written} new contributions from GitHub.` : "Nothing new since the last sync.");
    } catch (e) {
      setSyncMsg(e.message);
    } finally {
      setSyncing(false);
    }
  }

  const stats = profile?.stats || BASE_STATS;
  const progress = Math.min((contributions.length / MONTHLY_GOAL) * 100, 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading-brutal text-4xl text-ink">Your profile</h1>
          <p className="mt-2 font-medium text-ink/60">
            Identity, contribution stats, badges and your GitHub sync.
          </p>
        </div>
        <Link to="/portfolio" className="btn-brutal rounded-none bg-mint px-5 py-2 text-ink hover:bg-mint">
          View portfolio ↗
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="brutal bg-white p-6 text-center">
            {profile?.photoURL || user?.photoURL ? (
              <img
                src={profile?.photoURL || user?.photoURL}
                alt="avatar"
                className="mx-auto h-24 w-24 border-2 border-ink object-cover shadow-[4px_4px_0_#171717]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="mx-auto grid h-24 w-24 place-items-center border-2 border-ink bg-lava text-3xl font-extrabold text-ink shadow-[4px_4px_0_#171717]">
                {(profile?.displayName || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <h1 className="mt-4 text-xl font-extrabold uppercase tracking-tight text-ink">
              {profile?.displayName || user?.displayName || "Developer"}
            </h1>
            {profile?.githubUsername && (
              <a
                href={`https://github.com/${profile.githubUsername}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-mono text-sm font-bold text-ink underline decoration-2 underline-offset-2 hover:bg-canary"
              >
                @{profile.githubUsername}
              </a>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <span className="badge-brutal bg-canary-soft px-3 py-1 text-[11px] capitalize text-ink">{profile?.level || "beginner"}</span>
              {profile?.primaryLanguage && (
                <span className="badge-brutal bg-lava px-3 py-1 text-[11px] text-ink">{profile.primaryLanguage}</span>
              )}
            </div>
            {profile?.goals && (
              <p className="mt-4 inline-block border-2 border-ink bg-skyish/50 px-3 py-1.5 font-mono text-xs font-bold text-ink">🎯 {profile.goals}</p>
            )}
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="brutal bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">GitHub stats</h2>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-brutal rounded-none bg-ink px-3 py-1.5 text-[11px] text-canvas hover:bg-ink disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_#171717] disabled:opacity-40"
              >
                {syncing ? "Syncing..." : "⚡ Sync now"}
              </button>
            </div>
            {syncMsg && (
              <p className="mt-2 inline-block border-2 border-ink bg-canary-soft px-2 py-1 font-mono text-[11px] font-bold text-ink">{syncMsg}</p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "PRs merged", value: stats.totalMerged, accent: "bg-mint" },
                { label: "PRs opened", value: stats.totalOpened, accent: "bg-skyish" },
                { label: "Reviews", value: stats.reviews, accent: "bg-lava" },
              ].map((s) => (
                <div key={s.label} className={`brutal-sm ${s.accent} p-3 text-center`}>
                  <p className="font-mono text-2xl font-bold leading-none text-ink">{s.value}</p>
                  <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-ink/70">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-2 border-ink bg-canary-soft px-4 py-2 shadow-[2px_2px_0_#171717]">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink">Current streak</span>
              <span className="font-mono text-sm font-bold text-ink">{stats.streak || 0} days 🔥</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile?.languages || []).map((lang, i) => (
                <span key={lang} className={`badge-brutal px-2 py-0.5 text-[10px] text-ink ${["bg-lava", "bg-skyish", "bg-mint", "bg-coral", "bg-canary-soft"][i % 5]}`}>
                  {lang}
                </span>
              ))}
            </div>
            <Link to="/onboarding" className="btn-brutal mt-5 block rounded-none bg-white py-2 text-center text-sm text-ink">
              Edit profile
            </Link>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="brutal bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">Monthly goal</h2>
              <span className="font-mono text-sm font-bold text-ink">{contributions.length}/{MONTHLY_GOAL}</span>
            </div>
            <div className="mt-3 h-4 w-full border-2 border-ink bg-white">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-canary"
              />
            </div>
            <p className="mt-2 font-mono text-xs text-ink/60">
              {contributions.length >= MONTHLY_GOAL
                ? "Goal smashed. Keep the streak alive! 🎉"
                : `${MONTHLY_GOAL - contributions.length} more contributions this month.`}
            </p>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="brutal bg-lava p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">Share your portfolio</h2>
            <p className="mt-1 text-xs font-medium text-ink/70">
              Auto-built from your contributions, badges, and stack.
            </p>
            <Link
              to="/portfolio"
              className="btn-brutal mt-4 block rounded-none bg-ink py-2 text-center text-canvas"
            >
              Open portfolio →
            </Link>
            {profile?.portfolioUsername && (
              <p className="mt-2 text-center font-mono text-xs text-ink/60">devcollab.com/@{profile.portfolioUsername}</p>
            )}
          </motion.section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="brutal bg-white p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">Skill badges</h2>
            {!profile?.badges?.length ? (
              <p className="mt-3 text-sm font-medium text-ink/60">
                No badges yet. Merge a PR to earn your first one — it auto-appears here and on your portfolio.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {profile.badges.map((b, i) => (
                  <div
                    key={b.id}
                    className={`brutal-sm flex items-center gap-3 border-ink px-4 py-2 ${["bg-canary-soft", "bg-mint", "bg-lava", "bg-skyish", "bg-coral"][i % 5]}`}
                  >
                    <span className="text-2xl">{b.emoji}</span>
                    <div>
                      <p className="text-sm font-extrabold uppercase tracking-tight text-ink">{b.name}</p>
                      <p className="font-mono text-[11px] text-ink/60">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="brutal bg-white p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">Contribution timeline</h2>
            {contributions.length === 0 ? (
              <div className="mt-6 text-center text-ink">
                <p className="text-4xl">🫙</p>
                <p className="mt-3 font-extrabold uppercase tracking-tight">No contributions tracked yet</p>
                <p className="mt-1 text-sm font-medium text-ink/60">
                  Hit "Sync now" to pull your recent GitHub activity, or start with a project.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button onClick={handleSync} disabled={syncing} className="btn-brutal rounded-none bg-ink px-6 py-2 text-canvas hover:bg-ink disabled:opacity-40">
                    {syncing ? "Syncing..." : "⚡ Sync GitHub activity"}
                  </button>
                  <Link to="/discovery" className="btn-brutal rounded-none bg-canary px-6 py-2 text-ink hover:bg-canary">
                    Find a project
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {contributions.slice(0, 20).map((c) => {
                  const type = c.type === "merge" ? "merge" : c.type === "review" ? "review" : c.type === "docs" ? "docs" : "opened";
                  return (
                    <li key={c.id} className="brutal-sm flex items-center gap-3 border-ink bg-canvas px-4 py-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center border-2 border-ink text-base ${TYPE_STYLES[type] || "bg-white"}`}>
                        {type === "merge" ? "✅" : type === "review" ? "🔎" : type === "docs" ? "📝" : "🆕"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold uppercase tracking-tight text-ink">{c.title || c.prTitle || "Contribution"}</p>
                        <p className="font-mono text-xs text-ink/60">{c.repo || "repo"}</p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-ink/50">
                        {c.at ? new Date(c.at).toLocaleDateString() : new Date(c.loggedAt).toLocaleDateString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="brutal bg-white p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">GitHub API token</h2>
            <p className="mt-1 text-xs font-medium text-ink/60">
              Optional: a fine-grained token (public-repo read) lifts GitHub's anonymous rate limit so the feed and syncs always return live data. Stored in this browser only.
            </p>
            <GitHubTokenField />
          </motion.section>
        </div>
      </div>
    </div>
  );
}

function GitHubTokenField() {
  const [token, setToken] = useState(getGitHubToken() || "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setGitHubToken(token.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="ghp_… or github_pat_…"
        className="input-brutal flex-1 px-3 py-2"
      />
      <button onClick={handleSave} className="btn-brutal rounded-none bg-ink px-4 py-2 text-canvas hover:bg-ink">
        {saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}