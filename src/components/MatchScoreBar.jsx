import { motion } from "framer-motion";
import { matchTier } from "../lib/matchScore";

export default function MatchScoreBar({ score, tier }) {
  const t = tier || matchTier(score);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between">
        <span className="font-mono text-3xl font-bold leading-none text-ink">{score}%</span>
        <span
          className="badge-brutal px-1.5 py-0.5 text-[9px]"
          style={{ backgroundColor: `${t.color}1a`, color: t.color, borderColor: t.color }}
        >
          {t.label}
        </span>
      </div>
      <div className="mt-2 h-3 w-full border-2 border-ink bg-white">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full"
          style={{ backgroundColor: t.color }}
        />
      </div>
    </div>
  );
}