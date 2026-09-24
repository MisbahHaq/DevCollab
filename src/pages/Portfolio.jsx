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
          <h1 className="heading-brutal text-4xl text-ink">Your portfolio</h1>
          <p className="mt-2 font-medium text-ink/60">
            Auto-built from your real contributions and badges. Share it anywhere.
          </p>
        </div>
        <span className="badge-brutal bg-mint px-3 py-1.5 font-mono text-xs text-ink">
          devcollab.com/@{username}
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="brutal mt-8 bg-white"
      >
        <div className="flex h-24 border-b-2 border-ink">
          <span className="flex-1 bg-canary" />
          <span className="flex-1 bg-lava" />
          <span className="flex-1 bg-mint" />
          <span className="flex-1 bg-coral" />
          <span className="flex-1 bg-skyish" />
        </div>
        <div className="p-6">
          <div className="-mt-16 flex flex-wrap items-end gap-4">
            {profile?.photoURL || user?.photoURL ? (
              <img
                src={profile?.photoURL || user?.photoURL}
                alt="avatar"
                className="h-28 w-28 border-2 border-ink bg-canvas object-cover shadow-[4px_4px_0_#171717]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center border-2 border-ink bg-lava text-4xl font-extrabold text-ink shadow-[4px_4px_0_#171717]">
                {(profile?.displayName || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="pb-1">
              <h2 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
                {profile?.displayName || user?.displayName || "Developer"}
              </h2>
              <p className="font-mono text-sm text-ink/60">
                {profile?.githubUsername && <>@{profile.githubUsername} · </>}
                {profile?.level || "beginner"} · {profile?.availability || "casual"} hrs/week
              </p>
              {profile?.goals && (
                <p className="mt-1 font-mono text-xs text-ink/50">🎯 {profile.goals}</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "PRs merged", value: stats.totalMerged, accent: "bg-canary-soft" },
              { label: "Contributions", value: stats.totalOpened + stats.totalMerged, accent: "bg-mint" },
              { label: "Reviews", value: stats.reviews, accent: "bg-lava" },
              { label: "Day streak", value: stats.streak || 0, accent: "bg-skyish" },
            ].map((s) => (
              <div key={s.label} className={`brutal-sm ${s.accent} p-4 text-center`}>
                <p className="font-mono text-3xl font-bold leading-none text-ink">{s.value}</p>
                <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-ink/70">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-ink/70">Verified badges</h3>
            {!profile?.badges?.length ? (
              <p className="mt-2 font-mono text-sm text-ink/50">
                Earn badges by merging PRs — they'll show here automatically.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {profile.badges.map((b) => (
                  <div key={b.id} className="brutal-sm flex items-center gap-2 border-2 border-ink bg-canary-soft px-4 py-2">
                    <span className="text-xl">{b.emoji}</span>
                    <div>
                      <p className="text-sm font-extrabold uppercase tracking-tight text-ink">{b.name}</p>
                      <p className="font-mono text-[11px] text-ink/60">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(profile?.languages?.length || profile?.primaryLanguage) && (
            <div className="mt-6">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-ink/70">Stack</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {[profile.primaryLanguage, ...(profile.languages || [])].filter(Boolean).map((l) => (
                  <span key={l} className="badge-brutal border-2 border-ink bg-canvas px-2 py-1 font-mono text-xs font-bold text-ink">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => copy(`https://${publicUrl}`, "share")}
          className="brutal brutal-press cursor-pointer bg-white p-5 text-left text-ink"
        >
          <p className="flex items-center gap-2 font-extrabold uppercase tracking-tight">
            <span className="text-2xl">🔗</span> Share link
          </p>
          <p className="mt-1 truncate font-mono text-sm text-ink/60">{publicUrl}</p>
          <p className="mt-2 font-mono text-xs font-bold text-ink">
            {copied === "share" ? "Copied ✓" : "Copy to clipboard"}
          </p>
        </button>
        <button
          onClick={() => copy(readmeBadge, "badge")}
          className="brutal brutal-press cursor-pointer bg-white p-5 text-left text-ink"
        >
          <p className="flex items-center gap-2 font-extrabold uppercase tracking-tight">
            <span className="text-2xl">🎖️</span> GitHub README badge
          </p>
          <p className="mt-1 break-all font-mono text-xs text-ink/60">
            [![Open Source Contributor](https://img.shields.io/badge/...-{username}-6366f1)](...)
          </p>
          <p className="mt-2 font-mono text-xs font-bold text-ink">
            {copied === "badge" ? "Copied ✓" : "Copy markdown"}
          </p>
        </button>
      </div>
    </div>
  );
}