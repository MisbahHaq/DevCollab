import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    emoji: "🧲",
    title: "Match score",
    desc: "Percentage compatibility based on your skills vs. project tech stack.",
  },
  {
    emoji: "🎯",
    title: "Good first issues",
    desc: "Curated issues picked for your level so your first PR lands fast.",
  },
  {
    emoji: "📈",
    title: "Contribution tracker",
    desc: "PRs merged, reviews given, streaks kept — all in one timeline.",
  },
  {
    emoji: "🛠️",
    title: "Guided onboarding",
    desc: "README and CONTRIBUTING pulled straight from the repo.",
  },
  {
    emoji: "👥",
    title: "Team up",
    desc: "Find co-contributors on the same project and ship together.",
  },
  {
    emoji: "🎖️",
    title: "Skill badges",
    desc: "Verified badges for the stacks you've contributed to.",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-white to-accent-50" />
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block rounded-full border border-brand-200 bg-white px-4 py-1 text-sm font-medium text-brand-600"
          >
            Tinder for open source
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl"
          >
            Stop hunting issues.
            <br />
            <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
              Start shipping.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-xl text-lg text-slate-600"
          >
            Connect your GitHub, get a match score against every project, and land your first
            contribution in hours — not weeks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <Link
              to={user ? "/discovery" : "/login"}
              className="rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-700"
            >
              {user ? "Find your match" : "Get matched in 2 minutes"}
            </Link>
            <Link
              to="/discovery"
              className="rounded-full border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Browse projects
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Built for contributors <span className="text-brand-500">and</span> maintainers
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="text-3xl">{f.emoji}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-slate-900">How matching works</h2>
          <div className="mt-10 grid gap-8 text-left sm:grid-cols-3">
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
              <div key={s.n} className="relative rounded-2xl border border-slate-200 p-6">
                <span className="absolute -top-4 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-2 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}