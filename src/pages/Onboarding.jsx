import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../firebase/db";
import { fetchUserProfile, fetchContributionStreak } from "../firebase/githubService";

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "New to open source" },
  { id: "intermediate", label: "Intermediate", desc: "A few PRs shipped" },
  { id: "advanced", label: "Advanced", desc: "Regular contributor" },
  { id: "expert", label: "Expert", desc: "Maintainer or heavy contributor" },
];

const LANGUAGES = ["JavaScript", "TypeScript", "Python", "React", "Rust", "Go", "Java", "C++", "Ruby", "PHP", "C#", "Swift"];

const GOALS = [
  { id: "first_pr", label: "First open source PR", desc: "I want a guided first contribution" },
  { id: "portfolio", label: "Build a stronger portfolio", desc: "Showcase real merged work" },
  { id: "learning", label: "Learn a new stack", desc: "Level up in a new language/framework" },
  { id: "career", label: "Career growth", desc: "Get noticed by employers" },
  { id: "give_back", label: "Give back", desc: "Contribute to projects I use" },
];

const CONTRIBUTION_TYPES = ["Code", "Documentation", "Testing", "Design/UX", "Bug triage", "Translations"];

const INTERESTS = [
  { id: "frontend", label: "Frontend / UI" },
  { id: "backend", label: "Backend / APIs" },
  { id: "mobile", label: "Mobile" },
  { id: "devops", label: "DevOps / Infra" },
  { id: "ai", label: "AI / ML" },
  { id: "data", label: "Data / Databases" },
  { id: "docs", label: "Docs / Education" },
  { id: "testing", label: "Testing / QA" },
  { id: "security", label: "Security" },
];

const AVAILABILITY = [
  { id: "1-3", label: "1–3 hrs/week", desc: "Casual" },
  { id: "3-8", label: "3–8 hrs/week", desc: "Steady" },
  { id: "8-15", label: "8–15 hrs/week", desc: "Committed" },
  { id: "15+", label: "15+ hrs/week", desc: "All-in" },
];

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [githubUsername, setGithubUsername] = useState(profile?.githubUsername || user?.displayName || "");
  const [level, setLevel] = useState(profile?.level || "beginner");
  const [primaryLanguage, setPrimaryLanguage] = useState(profile?.primaryLanguage || "");
  const [languages, setLanguages] = useState(profile?.languages || []);
  const [goals, setGoals] = useState(profile?.goals || "");
  const [contributionTypes, setContributionTypes] = useState(profile?.contributionTypes || []);
  const [interests, setInterests] = useState(profile?.interests || []);
  const [availability, setAvailability] = useState(profile?.availability || "");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState(null);

  async function handleImport() {
    if (!githubUsername.trim()) return;
    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const gh = await fetchUserProfile(githubUsername.trim());
      const streak = await fetchContributionStreak(githubUsername.trim());
      setPrimaryLanguage(gh.topLanguages[0] || "");
      setLanguages(gh.topLanguages);
      setImportResult({ ...gh, streak });
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  function toggle(list, setter, value) {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const stats = { ...(profile?.stats || {}) };
      if (importResult) {
        stats.totalMerged = Math.max(stats.totalMerged || 0, Math.floor(importResult.publicRepos / 5));
        stats.streak = Math.max(stats.streak || 0, importResult.streak || 0);
      }
      const next = {
        githubUsername: githubUsername.trim(),
        level,
        primaryLanguage,
        languages,
        goals,
        contributionTypes,
        interests,
        availability,
        stats,
        onboardingComplete: true,
        portfolioUsername: profile?.portfolioUsername || slugify(githubUsername || user?.email?.split("@")[0]),
      };
      await updateUserProfile(user.uid, next);
      refreshProfile(next);
      navigate("/discovery");
    } catch (e) {
      setError(e.message || "Could not save your profile.");
      setSaving(false);
    }
  }

  const sections = [
    {
      step: "1",
      title: "Import from GitHub",
      body: (
        <div>
          <div className="mt-4 flex gap-2">
            <input
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="GitHub username"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={handleImport}
              disabled={importing || !githubUsername.trim()}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {importing ? "Analyzing..." : "Import"}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl bg-slate-50 p-4"
            >
              <div className="flex items-center gap-4">
                <img src={importResult.avatarUrl} alt={importResult.username} className="h-14 w-14 rounded-full" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-semibold text-slate-900">
                    {importResult.displayName}{" "}
                    <span className="font-normal text-slate-500">@{importResult.username}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {importResult.repoCount} repos · 🔥 {importResult.streak} day streak
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {importResult.topLanguages.map((lang) => (
                  <span key={lang} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600">
                    {lang}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Your shareable portfolio URL will be{" "}
            <span className="font-semibold text-brand-600">
              devcollab.com/@{slugify(githubUsername) || "you"}
            </span>
          </p>
        </div>
      ),
    },
    {
      step: "2",
      title: "Experience level",
      body: (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`rounded-xl border p-4 text-left transition ${
                level === l.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className={`font-semibold ${level === l.id ? "text-brand-600" : "text-slate-900"}`}>{l.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{l.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      step: "3",
      title: "Your tech stack",
      body: (
        <div>
          <div className="mt-4">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Primary language</label>
            <select
              value={primaryLanguage}
              onChange={(e) => setPrimaryLanguage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Select...</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Other languages / frameworks</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => toggle(languages, setLanguages, l)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    languages.includes(l) ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      step: "4",
      title: "Contribution type",
      desc: "What do you most want to do on a project?",
      body: (
        <div className="mt-4 flex flex-wrap gap-2">
          {CONTRIBUTION_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggle(contributionTypes, setContributionTypes, t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                contributionTypes.includes(t) ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ),
    },
    {
      step: "5",
      title: "Areas of interest",
      desc: "We bias the feed and teams toward these niches.",
      body: (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {INTERESTS.map((i) => (
            <button
              key={i.id}
              onClick={() => toggle(interests, setInterests, i.id)}
              className={`rounded-xl border p-3 text-left text-sm transition ${
                interests.includes(i.id) ? "border-brand-500 bg-brand-50 text-brand-700" : "text-slate-700 hover:border-slate-300"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      step: "6",
      title: "Weekly availability",
      body: (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {AVAILABILITY.map((a) => (
            <button
              key={a.id}
              onClick={() => setAvailability(a.id)}
              className={`rounded-xl border p-4 text-left transition ${
                availability === a.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className={`font-semibold ${availability === a.id ? "text-brand-600" : "text-slate-900"}`}>{a.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{a.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      step: "7",
      title: "Your goal",
      body: (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGoals(g.label)}
              className={`rounded-xl border p-4 text-left transition ${
                goals === g.label ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className={`font-semibold ${goals === g.label ? "text-brand-600" : "text-slate-900"}`}>{g.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{g.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Set up your profile</h1>
      <p className="mt-1 text-slate-600">
        The more we know, the sharper your matches, teams, and bounties get.
      </p>

      <div className="mt-8 space-y-6">
        {sections.map((s) => (
          <section key={s.step} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">
              {s.step} · {s.title}
            </h2>
            {s.desc && <p className="mt-1 text-sm text-slate-600">{s.desc}</p>}
            {s.body}
          </section>
        ))}

        <div className="flex justify-end pb-10">
          <button
            onClick={handleSave}
            disabled={saving || !primaryLanguage}
            className="rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & find my matches →"}
          </button>
        </div>
      </div>
    </div>
  );
}