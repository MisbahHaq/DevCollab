import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  fetchMaintainedProjects,
  publishProject,
  fetchProjectRequestsFor,
  updateProjectRequest,
} from "../firebase/db";
import { matchTier } from "../lib/matchScore";
import { updateUserProfile } from "../firebase/db";

const DIFFICULTIES = ["easy", "medium", "hard"];

export default function Maintainer() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ owner: "", name: "", description: "", languages: "", difficulty: "easy", helpNeeded: "", topics: "" });
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [registered, setRegistered] = useState(Boolean(profile?.maintainer?.registered)); 

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        fetchMaintainedProjects(user.uid),
        fetchProjectRequestsFor(user.uid),
      ]);
      setProjects(p);
      setRequests(r);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function handlePublish(e) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const id = await publishProject(user.uid, {
        owner: form.owner.trim(),
        name: form.name.trim(),
        fullName: `${form.owner.trim()}/${form.name.trim()}`,
        description: form.description.trim(),
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        difficulty: form.difficulty,
        topics: form.topics.split(",").map((s) => s.trim()).filter(Boolean),
        helpNeeded: form.helpNeeded.trim(),
        stars: 0,
        openIssues: 0,
        forks: 0,
        hasGoodFirstIssues: true,
        size: "medium",
        estimatedFirstContribution: "2–4 hours",
      });
      const maintainer = { ...(profile?.maintainer || {}), registered: true };
      await updateUserProfile(user.uid, { maintainer });
      refreshProfile({ maintainer });
      setRegistered(true);
      setNotice(`Registered ${id}. Contributors can now find and request it.`);
      setForm({ owner: "", name: "", description: "", languages: "", difficulty: "easy", helpNeeded: "", topics: "" });
      load();
    } catch (e) {
      setNotice("Could not publish: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function review(requestId, status) {
    try {
      await updateProjectRequest(user.uid, requestId, status);
      setRequests((rs) => rs.map((r) => (r.id === requestId ? { ...r, status } : r)));
    } catch {}
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Maintainer dashboard</h1>
      <p className="mt-1 text-slate-600">Post your repo, then triage the contributors we send you — pre-scored.</p>

      {!registered && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-6">
          <h2 className="font-semibold text-slate-900">📣 Register a repository</h2>
          <form onSubmit={handlePublish} className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input required value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="GitHub owner (org or user)" className={inputClass} />
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Repo name" className={inputClass} />
            </div>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does the project do? What help do you need?" className={inputClass} rows={3} />
            <div className="grid gap-3 sm:grid-cols-3">
              <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Languages: TypeScript, React" className={inputClass} />
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={inputClass}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} placeholder="Topics: ui, design-system" className={inputClass} />
            </div>
            <div>
              <button type="submit" disabled={busy} className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                {busy ? "Publishing..." : "Publish project"}
              </button>
              {notice && <p className="mt-2 text-sm text-brand-700">{notice}</p>}
            </div>
          </form>
        </motion.section>
      )}

      {registered && notice && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Your projects</h2>
            <button onClick={() => setRegistered(false)} className="text-xs font-medium text-brand-600 hover:underline">
              + Register another
            </button>
          </div>
          {projects.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No projects posted yet. Register one to start receiving contributor requests.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              <AnimatePresence>
                {projects.map((p) => {
                  const projectRequests = requests.filter((r) => r.projectId === p.id);
                  return (
                    <motion.li key={p.id} layout className="rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{p.id}</p>
                          <p className="text-xs text-slate-500">{p.helpNeeded || p.description}</p>
                        </div>
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                          {projectRequests.filter((r) => r.status === "pending").length} pending
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Languages: {(p.languages || []).join(", ") || "—"} · {p.difficulty}
                      </p>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Incoming contributor requests</h2>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Requests appear here when a developer likes one of your projects. They include their match score so you can triage fast.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {requests.map((r) => {
                const tier = matchTier(r.score);
                return (
                  <li key={r.id} className="rounded-xl border border-slate-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                          {(r.uid || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{r.projectOwner}/{r.projectName}</p>
                          <p className="text-xs text-slate-500">{r.status === "pending" ? "Looking for a spot" : `Response: ${r.status}`}</p>
                        </div>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${tier.color}1a`, color: tier.color }}>
                        {r.score}% match
                      </span>
                    </div>
                    {r.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => review(r.id, "accepted")} className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
                          Accept
                        </button>
                        <button onClick={() => review(r.id, "declined")} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400">
                          Decline
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";