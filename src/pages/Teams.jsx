import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  fetchUserTeams,
  createTeam,
  addTeamMember,
  assignTeamIssue,
  updateTeamIssue,
  fetchSavedProjectIds,
  fetchProjectRequesters,
  getUserDoc,
} from "../firebase/db";

export default function Teams() {
  const { user, profile } = useAuth();
  const [teams, setTeams] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ name: "", projectId: "", description: "" });
  const [coContributors, setCoContributors] = useState([]);
  const [saved, setSaved] = useState({});
  const [issue, setIssue] = useState({ title: "", url: "" });
  const [notice, setNotice] = useState("");
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await fetchUserTeams(user.uid);
      setTeams(t);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (user) {
      load();
      fetchSavedProjectIds(user.uid)
        .then(setSaved)
        .catch(() => {});
    }
  }, [user, load]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const team = await createTeam(user.uid, form);
      setTeams((t) => [...t, team]);
      setForm({ name: "", projectId: "", description: "" });
      setNotice(`Team “${form.name}” created.`);
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setNotice("Could not create team.");
    }
  }

  async function findCoContributors(projectId) {
    setSearching(true);
    setNotice("");
    try {
      const actions = await fetchProjectRequesters();
      const uids = new Set(
        actions.filter((a) => a.projectId === projectId && a.action === "like" && a.uid !== user.uid).map((a) => a.uid)
      );
      const folks = [];
      for (const uid of [...uids].slice(0, 12)) {
        try {
          const doc = await getUserDoc(uid);
          if (doc) folks.push({ ...doc, uid });
        } catch {}
      }
      setCoContributors(folks);
    } catch {
      setCoContributors([]);
    } finally {
      setSearching(false);
    }
  }

  async function joinTeam(teamId) {
    try {
      await addTeamMember(teamId, user.uid);
      load();
    } catch {}
  }

  async function addIssue(teamId) {
    if (!issue.title) return;
    try {
      await assignTeamIssue(teamId, { title: issue.title, assignedTo: user.uid, url: issue.url });
      setIssue({ title: "", url: "" });
      load();
    } catch {}
  }

  async function setIssueStatus(teamId, issueId, status) {
    try {
      await updateTeamIssue(teamId, issueId, status);
      load();
    } catch {}
  }

  const likedProjects = Object.entries(saved).filter(([, a]) => a === "like").map(([id]) => id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Team formation</h1>
      <p className="mt-1 text-slate-600">Find co-contributors on the same project, claim issues, and ship together.</p>

      {notice && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Create a team</h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Team name" className={inputClass} />
            <input
              list="liked-projects"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              placeholder="Project (owner/name)"
              className={inputClass}
            />
            <datalist id="liked-projects">
              {likedProjects.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will the team work on?" className={inputClass} rows={2} />
            <button type="submit" className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              Create team
            </button>
          </form>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Find co-contributors</h2>
          <p className="mt-1 text-xs text-slate-500">Pick one of your liked projects to see who else wants in.</p>
          <select onChange={(e) => e.target.value && findCoContributors(e.target.value)} className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
            <option value="">Choose a liked project...</option>
            {likedProjects.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          {searching && <p className="mt-3 text-sm text-slate-400">Searching...</p>}
          {coContributors.length > 0 && (
            <ul className="mt-4 space-y-2">
              {coContributors.map((c) => (
                <li key={c.uid} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    {(c.displayName || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{c.displayName || c.uid.slice(0, 6)}</p>
                    <p className="text-[11px] text-slate-500">
                      {c.primaryLanguage || "—"} · {c.level} · {c.stats?.totalMerged || 0} merged
                    </p>
                  </div>
                  <span className="text-xs font-medium text-brand-600">{c.availability || "casual"}</span>
                </li>
              ))}
            </ul>
          )}
          {!searching && coContributors.length === 0 && likedProjects.length > 0 && (
            <p className="mt-4 text-xs text-slate-400">No other contributors on this project yet — create a team and invite them by share.</p>
          )}
        </motion.section>
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Your teams</h2>
        {teams.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No teams yet. Create one above to get started.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            <AnimatePresence>
              {teams.map((t) => (
                <motion.li key={t.id} layout className="rounded-2xl border border-slate-100">
                  <button onClick={() => setOpenId(openId === t.id ? null : t.id)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                    <div>
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.projectName || t.projectId} · {Object.keys(t.members || {}).length} members · {t.issues?.length || 0} issues</p>
                    </div>
                    <span className="text-slate-400">{openId === t.id ? "▴" : "▾"}</span>
                  </button>
                  {openId === t.id && (
                    <div className="border-t border-slate-100 px-5 py-4">
                      {!t.members?.[user.uid] && t.ownerUid !== user.uid && (
                        <button onClick={() => joinTeam(t.id)} className="mb-4 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                          Join team
                        </button>
                      )}

                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned issues</h4>
                          {t.issues?.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">No issues assigned yet.</p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {t.issues.map((i) => (
                                <li key={i.id} className="rounded-lg bg-slate-50 px-3 py-2">
                                  <p className="text-sm font-medium text-slate-900">{i.title}</p>
                                  {i.url && <a href={i.url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Link →</a>}
                                  <div className="mt-1 flex items-center justify-between">
                                    <span className={`text-xs ${i.status === "done" ? "text-emerald-600" : "text-amber-600"}`}>{i.status}</span>
                                    <button onClick={() => setIssueStatus(t.id, i.id, i.status === "done" ? "open" : "done")} className="text-xs font-medium text-brand-600 hover:underline">
                                      Mark {i.status === "done" ? "open" : "done"}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 flex gap-2">
                            <input value={issue.title} onChange={(e) => setIssue({ ...issue, title: e.target.value })} placeholder="Issue title" className={inputClass} />
                            <button onClick={() => addIssue(t.id)} className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                              Assign
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leaderboard</h4>
                          <ul className="mt-2 space-y-2">
                            {Object.entries(t.members || {})
                              .sort(([, a], [, b]) => (b.points || 0) - (a.points || 0))
                              .map(([uid, m]) => (
                                <li key={uid} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                  <span className="font-medium text-slate-700">
                                    {(m.displayName || uid.slice(0, 6))}
                                    {m.role === "owner" && <span className="ml-1 text-xs text-violet-500">· owner</span>}
                                  </span>
                                  <span className="text-xs text-slate-500">{(m.points || 0)} pts</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";