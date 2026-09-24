import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { BASE_STATS } from "../lib/stats";

export default function Portfolio() {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState("");

  const username = profile?.portfolioUsername || profile?.githubUsername || (user?.email || "you").split("@")[0];
  const publicUrl = `devcollab.com/@${username}`;
  const stats = profile?.stats || BASE_STATS;

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {}
  }

  const readmeBadge = `<!-- devcollab -->\n[![Contributor](https://img.shields.io/badge/${encodeURIComponent("Open Source Contributor")}-${username}-6366f1)](https://${publicUrl})`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your portfolio</h1>
          <p className="mt-1 text-slate-600">Auto-built from your real contributions and badges. Share it anywhere.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
          devcollab.com/@{username}
        </span>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-brand-500 via-accent-500 to-pink-500" />
        <div className="p-8">
          <div className="-mt-20 flex items-end gap-4">
            {profile?.photoURL || user?.photoURL ? (
              <img src={profile?.photoURL || user?.photoURL} alt="avatar" className="h-28 w-28 rounded-3xl border-4 border-white shadow-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-3xl border-4 border-white bg-brand-500 text-4xl font-bold text-white shadow-lg">
                {(profile?.displayName || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="pb-1">
              <h2 className="text-2xl font-bold text-slate-900">{profile?.displayName || user?.displayName || "Developer"}</h2>
              <p className="text-sm text-slate-500">
                {profile?.githubUsername && <>@{profile.githubUsername} · </>}
                {profile?.level || "beginner"} · {profile?.availability || "casual"} hrs/week
              </p>
              {profile?.goals && <p className="mt-1 text-xs text-slate-400">🎯 {profile.goals}</p>}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              { label: "PRs merged", value: stats.totalMerged },
              { label: "Contributions", value: stats.totalOpened + stats.totalMerged },
              { label: "Reviews", value: stats.reviews },
              { label: "Day streak", value: stats.streak || 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                <p className="mt-1 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Verified badges</h3>
            {!profile?.badges?.length ? (
              <p className="mt-2 text-sm text-slate-500">Earn badges by merging PRs — they'll show here automatically.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {profile.badges.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2">
                    <span className="text-xl">{b.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                      <p className="text-[11px] text-slate-500">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(profile?.languages?.length || profile?.primaryLanguage) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Stack</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {[profile.primaryLanguage, ...(profile.languages || [])].filter(Boolean).map((l) => (
                  <span key={l} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600">{l}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => copy(`https://${publicUrl}`, "share")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300"
        >
          <p className="font-semibold text-slate-900">🔗 Share link</p>
          <p className="mt-1 text-sm text-slate-500">{publicUrl}</p>
          <p className="mt-2 text-xs font-medium text-brand-600">{copied === "share" ? "Copied ✓" : "Copy to clipboard"}</p>
        </button>
        <button
          onClick={() => copy(readmeBadge, "badge")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300"
        >
          <p className="font-semibold text-slate-900">🎖️ GitHub README badge</p>
          <p className="mt-1 break-all text-xs text-slate-500">[![Open Source Contributor](https://img.shields.io/badge/...-{username}-6366f1)](...)</p>
          <p className="mt-2 text-xs font-medium text-brand-600">{copied === "badge" ? "Copied ✓" : "Copy markdown"}</p>
        </button>
      </div>
    </div>
  );
}