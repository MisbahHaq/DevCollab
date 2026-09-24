import { motion } from "framer-motion";
import { matchTier } from "../lib/matchScore";

export default function MatchScoreBar({ score, tier }) {
  const t = tier || matchTier(score);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold" style={{ color: t.color }}>
          {score}%
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${t.color}1a`, color: t.color }}
        >
          {t.label}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: t.color }}
        />
      </div>
    </div>
  );
}