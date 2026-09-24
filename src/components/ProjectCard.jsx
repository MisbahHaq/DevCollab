import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MatchScoreBar from "./MatchScoreBar";
import { matchTier } from "../lib/matchScore";

const DIFFICULTY_STYLES = {
  easy: "bg-mint",
  medium: "bg-canary-soft",
  hard: "bg-coral",
};

const LANG_CHIPS = ["bg-lava", "bg-skyish", "bg-mint", "bg-coral", "bg-canary-soft"];

export default function ProjectCard({ project, match, actions = {}, onAction }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const state = actions[project.id];

  return (
    <article className="brutal overflow-hidden bg-white transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link to={`/project/${project.owner}/${project.name}`} className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-ink text-sm font-extrabold text-canary shadow-[2px_2px_0_#171717]">
                {project.owner?.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-extrabold uppercase tracking-tight text-ink hover:underline">
                  {project.owner}/{project.name}
                </h3>
                <span className="font-mono text-xs text-ink/60">
                  ⭐ {formatCount(project.stars)} · {project.openIssues} open issues
                </span>
              </div>
            </Link>
            {project.maintainerPosted && (
              <span className="badge-brutal mt-1 bg-lava px-2 py-0.5 text-[10px] text-ink">
                📣 Posted by maintainer
              </span>
            )}
          </div>
          <div className="w-28 shrink-0">
            <MatchScoreBar score={match?.score ?? 0} />
          </div>
        </div>

        <p className="mt-3 line-clamp-2 break-words text-sm font-medium text-ink/80">{project.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(project.languages || []).map((lang, i) => (
            <span
              key={lang}
              className={`badge-brutal px-2 py-0.5 text-[10px] text-ink ${LANG_CHIPS[i % LANG_CHIPS.length]}`}
            >
              {lang}
            </span>
          ))}
          <span className={`badge-brutal px-2 py-0.5 text-[10px] capitalize text-ink ${DIFFICULTY_STYLES[project.difficulty]}`}>
            {project.difficulty}
          </span>
          {project.hasGoodFirstIssues && (
            <span className="badge-brutal bg-mint px-2 py-0.5 text-[10px] text-ink">🌱 first issues</span>
          )}
        </div>

        {showBreakdown && match?.breakdown && (
          <div className="mt-4 border-2 border-ink bg-canvas p-4 shadow-[3px_3px_0_#171717]">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink">Why you match</h4>
            <ul className="mt-2 space-y-2">
              {Object.entries(match.breakdown).map(([key, b]) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="text-ink/70">{b.label}</span>
                  <span className="font-mono font-bold" style={{ color: matchTier(b.score).color }}>
                    {b.score}%
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t-2 border-ink/15 pt-3 font-mono text-xs text-ink/60">
              ⏱ estimated first contribution: {project.estimatedFirstContribution}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBreakdown((s) => !s)}
              className="btn-brutal rounded-none bg-canvas px-2 py-1 text-[11px] text-ink hover:bg-canvas"
            >
              {showBreakdown ? "Hide breakdown" : "Why do I match?"}
            </button>
            <Link
              to={`/project/${project.owner}/${project.name}`}
              className="btn-brutal rounded-none bg-skyish px-2 py-1 text-[11px] text-ink hover:bg-skyish"
            >
              Details →
            </Link>
          </div>

          {onAction ? (
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onAction(project, "bookmark")}
                className={`btn-brutal rounded-none px-3 py-1.5 text-[11px] ${
                  state === "bookmark" ? "bg-canary text-ink" : "bg-canvas text-ink hover:bg-canary-soft"
                }`}
                title="Bookmark / shortlist"
              >
                {state === "bookmark" ? "★ Saved" : "☆ Save"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onAction(project, "pass")}
                className={`btn-brutal rounded-none px-3 py-1.5 text-[11px] ${
                  state === "pass" ? "bg-ink text-canvas" : "bg-canvas text-ink hover:bg-coral"
                }`}
                title="Not for me"
              >
                ⏭ Pass
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onAction(project, "like")}
                className={`btn-brutal rounded-none px-3 py-1.5 text-[11px] ${
                  state === "like" ? "bg-coral text-ink" : "bg-mint text-ink hover:bg-mint"
                }`}
                title="Like / tell the maintainer you're interested"
              >
                {state === "like" ? "♥ Liked" : "♥ Like"}
              </motion.button>
            </div>
          ) : (
            <a
              href={`https://github.com/${project.owner}/${project.name}/issues?q=${
                project.hasGoodFirstIssues ? 'label:"good first issue"' : ""
              }`}
              target="_blank"
              rel="noreferrer"
              className="btn-brutal rounded-none bg-ink px-4 py-1.5 text-[11px] text-canvas hover:bg-ink"
            >
              {project.hasGoodFirstIssues ? "First issue →" : "View on GitHub"}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}