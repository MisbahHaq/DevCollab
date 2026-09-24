import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { fetchRecentContributions, syncContributions } from "../firebase/db";
import { fetchUserEvents, setGitHubToken, getGitHubToken } from "../firebase/githubService";

const MONTHLY_GOAL = 5;

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

  const stats = profile?.stats || { totalMerged: 0, totalOpened: 0, reviews: 0, docsMerged: 0, streak: 0 };
  const progress = Math.min((contributions.length / MONTHLY_GOAL) * 100, 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            {profile?.photoURL || user?.photoURL ? (
              <img src={profile?.photoURL || user?.photoURL} alt="avatar" className="mx-auto h-24 w-24 rounded-full ring-4 ring-brand-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand-500 text-3xl font-bold text-white">
                {(profile?.displayName || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <h1 className="mt-3 text-xl font-bold text-slate-900">{profile?.displayName || user?.displayName || "Developer"}</h1>
            {profile?.githubUsername && (
              <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                @{profile.githubUsername}
              </a>
            )}
            <div className="mt-3 flex justify-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">{profile?.level || "beginner"}</span>
              {profile?.primaryLanguage && (
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">{profile.primaryLanguage}</span>
              )}
            </div>
            {profile?.goals && <p className="mt-3 text-xs text-slate-500">🎯 {profile.goals}</p>}
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">GitHub stats</h2>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "⚡ Sync now"}
              </button>
            </div>
            {syncMsg && <p className="mt-2 text-xs text-slate-500">{syncMsg}</p>}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "PRs merged", value: stats.totalMerged },
                { label: "PRs opened", value: stats.totalOpened },
                { label: "Reviews", value: stats.reviews },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-700">
              <span>Current streak</span>
              <span className="font-bold">{stats.streak || 0} days 🔥</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile?.languages || []).map((lang) => (
                <span key={lang} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{lang}</span>
              ))}
            </div>
            <Link to="/onboarding" className="mt-5 block rounded-full border border-slate-300 py-2 text-center text-sm font-semibold text-slate-700 hover:border-slate-400">
              Edit profile
            </Link>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Monthly goal</h2>
              <span className="text-sm font-bold text-brand-600">{contributions.length}/{MONTHLY_GOAL}</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {contributions.length >= MONTHLY_GOAL ? "Goal smashed. Keep the streak alive! 🎉" : `${MONTHLY_GOAL - contributions.length} more contributions this month.`}
            </p>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Share your portfolio</h2>
            <p className="mt-1 text-xs text-slate-500">
              Auto-built from your contributions, badges, and stack.
            </p>
            <Link
              to="/portfolio"
              className="mt-4 block rounded-full bg-brand-500 py-2 text-center text-sm font-semibold text-white hover:bg-brand-600"
            >
              Open portfolio →
            </Link>
            {profile?.portfolioUsername && (
              <p className="mt-2 text-center text-xs text-slate-400">devcollab.com/@{profile.portfolioUsername}</p>
            )}
          </motion.section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Skill badges</h2>
            {!profile?.badges?.length ? (
              <p className="mt-3 text-sm text-slate-500">
                No badges yet. Merge a PR to earn your first one — it auto-appears here and on your portfolio.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {profile.badges.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2">
                    <span className="text-2xl">{b.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                      <p className="text-[11px] text-slate-500">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Contribution timeline</h2>
            {contributions.length === 0 ? (
              <div className="mt-6 text-center text-slate-500">
                <p className="text-4xl">🫙</p>
                <p className="mt-3 font-medium text-slate-700">No contributions tracked yet</p>
                <p className="mt-1 text-sm">Hit “Sync now” to pull your recent GitHub activity, or start with a project.</p>
                <div className="mt-5 flex justify-center gap-3">
                  <button onClick={handleSync} disabled={syncing} className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                    {syncing ? "Syncing..." : "⚡ Sync GitHub activity"}
                  </button>
                  <Link to="/discovery" className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                    Find a project
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {contributions.slice(0, 20).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-lg">{c.type === "merge" ? "✅" : c.type === "review" ? "🔎" : "🆕"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{c.title || c.prTitle || "Contribution"}</p>
                      <p className="text-xs text-slate-500">{c.repo || "repo"}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {c.at ? new Date(c.at).toLocaleDateString() : new Date(c.loggedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">GitHub API token</h2>
            <p className="mt-1 text-xs text-slate-500">
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
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <button onClick={handleSave} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
        {saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}