import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    emoji: "🧲",
    title: "Match score",
    desc: "Percentage compatibility based on your skills vs. project tech stack.",
    accent: "bg-canary-soft",
  },
  {
    emoji: "🎯",
    title: "Good first issues",
    desc: "Curated issues picked for your level so your first PR lands fast.",
    accent: "bg-lava",
  },
  {
    emoji: "📈",
    title: "Contribution tracker",
    desc: "PRs merged, reviews given, streaks kept — all in one timeline.",
    accent: "bg-mint",
  },
  {
    emoji: "🛠️",
    title: "Guided onboarding",
    desc: "README and CONTRIBUTING pulled straight from the repo.",
    accent: "bg-skyish",
  },
  {
    emoji: "👥",
    title: "Team up",
    desc: "Find co-contributors on the same project and ship together.",
    accent: "bg-coral",
  },
  {
    emoji: "🎖️",
    title: "Skill badges",
    desc: "Verified badges for the stacks you've contributed to.",
    accent: "bg-canary-soft",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <section className="relative overflow-hidden border-b-2 border-ink">
        <div className="absolute inset-0 -z-10 grid grid-cols-6 bg-canvas">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-r-2 border-ink/10" />
          ))}
        </div>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="badge-brutal bg-canary px-4 py-1.5 text-xs text-ink"
          >
            Tinder for open source
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="heading-brutal mx-auto mt-6 max-w-3xl text-5xl text-ink sm:text-6xl"
          >
            Stop hunting issues.
            <br />
            <span className="inline-block border-4 border-ink bg-canary px-3 shadow-[6px_6px_0_#171717]">
              Start shipping.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-8 max-w-xl text-lg font-medium text-ink/70"
          >
            Connect your GitHub, get a match score against every project, and land your first
            contribution in hours — not weeks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-10 flex items-center justify-center gap-3"
          >
            <Link
              to={user ? "/dashboard" : "/login"}
              className="btn-brutal rounded-none bg-ink px-8 py-3.5 text-[15px] text-canvas"
            >
              {user ? "Open mission control" : "Get matched in 2 minutes"}
            </Link>
            <Link
              to="/discovery"
              className="btn-brutal rounded-none bg-white px-8 py-3.5 text-[15px] text-ink"
            >
              Browse projects
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24">
        <h2 className="heading-brutal text-center text-3xl text-ink">
          Built for contributors <span className="bg-black px-2 text-canary">&</span> maintainers
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`brutal ${f.accent} p-6 transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none`}
            >
              <div className="inline-block border-2 border-ink bg-white px-3 py-1 text-2xl shadow-[2px_2px_0_#171717]">{f.emoji}</div>
              <h3 className="mt-4 text-lg font-extrabold uppercase tracking-tight text-ink">{f.title}</h3>
              <p className="mt-1 text-sm font-medium text-ink/70">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-ink bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="heading-brutal text-3xl text-ink">How matching works</h2>
          <div className="mt-12 grid gap-8 text-left sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "Import your GitHub",
                desc: "We analyze your repos, languages, and contribution history instantly.",
              },
              {
                n: "02",
                title: "Score every project",
                desc: "Language match, framework overlap, and experience fit weighted per project.",
              },
              {
                n: "03",
                title: "Ship your first PR",
                desc: "Good first issues, onboarding guides, and a direct link to the repo.",
              },
            ].map((s) => (
              <div key={s.n} className="relative border-2 border-ink bg-canvas p-6 pb-8 pt-8 shadow-[4px_4px_0_#171717]">
                <span className="absolute -top-4 left-6 border-2 border-ink bg-canary px-3 py-1 font-mono text-sm font-bold text-ink shadow-[2px_2px_0_#171717]">
                  {s.n}
                </span>
                <h3 className="text-lg font-extrabold uppercase tracking-tight text-ink">{s.title}</h3>
                <p className="mt-1 text-sm font-medium text-ink/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}