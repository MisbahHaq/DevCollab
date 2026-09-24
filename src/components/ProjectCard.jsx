import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MatchScoreBar from "./MatchScoreBar";
import { matchTier } from "../lib/matchScore";

const DIFFICULTY_STYLES = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700",
};

export default function ProjectCard({ project, match, actions = {}, onAction }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const state = actions[project.id];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to={`/project/${project.owner}/${project.name}`} className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
                {project.owner?.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h3 className="truncate font-semibold text-slate-900 hover:text-brand-600">
                  {project.owner}/{project.name}
                </h3>
                <span className="text-xs text-slate-500">
                  ⭐ {formatCount(project.stars)} · {project.openIssues} open issues
                </span>
              </div>
            </Link>
            {project.maintainerPosted && (
              <span className="mt-1 inline-block rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                📣 Posted by maintainer
              </span>
            )}
          </div>
          <div className="w-28 shrink-0">
            <MatchScoreBar score={match?.score ?? 0} />
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{project.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(project.languages || []).map((lang) => (
            <span
              key={lang}
              className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600"
            >
              {lang}
            </span>
          ))}
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_STYLES[project.difficulty]}`}>
            {project.difficulty}
          </span>
          {project.hasGoodFirstIssues && (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
              🌱 good first issues
            </span>
          )}
        </div>

        {showBreakdown && match?.breakdown && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why you match</h4>
            <ul className="mt-2 space-y-2">
              {Object.entries(match.breakdown).map(([key, b]) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{b.label}</span>
                  <span className="font-medium text-slate-900" style={{ color: matchTier(b.score).color }}>
                    {b.score}%
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
              ⏱️ Estimated first contribution:{" "}
              <span className="font-medium text-slate-700">{project.estimatedFirstContribution}</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBreakdown((s) => !s)}
              className="text-xs font-medium text-brand-600 hover:text-brand-500"
            >
              {showBreakdown ? "Hide breakdown" : "Why do I match?"}
            </button>
            <Link
              to={`/project/${project.owner}/${project.name}`}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Details →
            </Link>
          </div>

          {onAction ? (
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onAction(project, "pass")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  state === "pass"
                    ? "border-slate-700 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-500 hover:border-slate-400"
                }`}
                title="Not for me"
              >
                ⏭ Pass
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onAction(project, "like")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  state === "like"
                    ? "bg-accent-500 text-white"
                    : "bg-brand-500 text-white hover:bg-brand-600"
                }`}
                title="Save project"
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
              className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              {project.hasGoodFirstIssues ? "First issue →" : "View on GitHub"}
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}