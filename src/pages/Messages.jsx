import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  fetchMyThreads,
  fetchThreadMessages,
  sendMessage,
  startDirectMessage,
  createProjectThread,
  fetchUsers,
  fetchSavedProjectIds,
  fetchAllMaintainedProjects,
} from "../firebase/db";
import { fetchProjectPool } from "../firebase/githubService";
import { mockProjects } from "../data/mockProjects";
import { sampleMentors } from "../data/sampleData";

const SAMPLE_THREADS = [
  {
    id: "demo-dm-1",
    kind: "dm",
    title: "Aisha Rahman",
    sub: "@aisha-dev · Frontend lead",
    accent: "bg-lava",
    lastMessage: "Thanks for the PR draft — looks great! 🚀",
    when: "2h ago",
  },
  {
    id: "demo-prj-1",
    kind: "project",
    title: "vercel/next.js",
    sub: "Project discussion",
    accent: "bg-canary-soft",
    lastMessage: "I can take the Turbopack caching issue 👀",
    when: "5h ago",
  },
  {
    id: "demo-ment-1",
    kind: "mentorship",
    title: "Mentorship",
    sub: "Daniel Okafor",
    accent: "bg-mint",
    lastMessage: "Let's walk through the newtype pattern next session.",
    when: "1d ago",
  },
];

const SAMPLE_MESSAGES = [
  { id: "s1", uid: "them", text: "Hey! Saw you saved next.js — great pick for first contributions.", at: "2026-09-21T10:00:00.000Z" },
  { id: "s2", uid: "me", text: "Hey, yeah! The onboarding guide is super clear.", at: "2026-09-21T10:02:00.000Z" },
  { id: "s3", uid: "them", text: "There's a good first issue on caching with a warm welcome note. Want me to link it?", at: "2026-09-21T10:03:00.000Z" },
  { id: "s4", uid: "me", text: "Yes please 🙌", at: "2026-09-21T10:05:00.000Z" },
];

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState(SAMPLE_THREADS);
  const [live, setLive] = useState(false);
  const [activeId, setActiveId] = useState(SAMPLE_THREADS[0]?.id);
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [draft, setDraft] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newMode, setNewMode] = useState("dm");
  const [directory, setDirectory] = useState([]);
  const [savableIds, setSavableIds] = useState([]);
  const [newDraft, setNewDraft] = useState("");
  const [target, setTarget] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const activeThread = activeId ? threads.find((t) => t.id === activeId) || null : null;
  const isDemo = activeId?.startsWith("demo-");

  const loadThreads = useCallback(async () => {
    try {
      const t = await fetchMyThreads(user.uid);
      if (t.length) {
        setThreads(t.map((th) => ({ ...th, accent: th.kind === "dm" ? "bg-skyish" : th.kind === "project" ? "bg-canary-soft" : "bg-mint" })));
        setLive(true);
      }
    } catch {}
  }, [user]);

  const loadMessages = useCallback(
    async (threadId) => {
      try {
        const msgs = await fetchThreadMessages(threadId);
        setMessages(msgs);
      } catch {
        setMessages(SAMPLE_MESSAGES);
      }
    },
    []
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId || activeId.startsWith("demo-")) {
      setMessages(SAMPLE_MESSAGES);
      return;
    }
    loadMessages(activeId);
    const id = setInterval(() => loadMessages(activeId), 6000);
    return () => clearInterval(id);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (live) {
      const id = setInterval(loadThreads, 20000);
      return () => clearInterval(id);
    }
  }, [live, loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  // Candidate directory for starting DMs + saved projects for discussions
  useEffect(() => {
    (async () => {
      try {
        const users = await fetchUsers(50);
        setDirectory(users.filter((u) => u.uid !== user.uid));
      } catch {
        setDirectory(sampleMentors.map((m) => ({ ...m, uid: m.id })));
      }
      try {
        const pool = await fetchProjectPool().catch(() => []);
        const posted = await fetchAllMaintainedProjects().catch(() => []);
        const all = [...pool, ...posted];
        const actions = await fetchSavedProjectIds(user.uid).catch(() => ({}));
        const ids = Object.entries(actions).filter(([, a]) => a === "like" || a === "bookmark").map(([id]) => id);
        const resolvable = all.filter((p) => ids.length === 0 || ids.includes(p.id));
        setSavableIds(ids.length ? resolvable : mockProjects.slice(0, 6));
      } catch {
        setSavableIds(mockProjects.slice(0, 6));
      }
    })();
  }, [user]);

  async function handleSend() {
    if (!draft.trim() || !activeId) return;
    if (isDemo) {
      setMessages((msgs) => [...msgs, { id: `local-${Date.now()}`, uid: "me", text: draft, at: new Date().toISOString() }]);
      setDraft("");
      return;
    }
    try {
      await sendMessage(activeId, user.uid, draft);
      setDraft("");
      loadMessages(activeId);
      loadThreads();
    } catch {
      setMessages((msgs) => [...msgs, { id: `local-${Date.now()}`, uid: "me", text: draft, at: new Date().toISOString() }]);
      setDraft("");
    }
  }

  async function startThread(e) {
    e.preventDefault();
    if (!newDraft.trim() || !target) return;
    setSending(true);
    try {
      let id;
      if (newMode === "dm") {
        id = await startDirectMessage(user.uid, target, newDraft);
      } else {
        const project = savableIds.find((p) => p.id === target || `${p.owner}/${p.name}` === target) || { id: target, owner: target.split("/")[0], name: target.split("/")[1] };
        id = await createProjectThread(user.uid, project, newDraft);
      }
      setShowNew(false);
      setNewDraft("");
      setTarget("");
      await loadThreads();
      setActiveId(id);
      loadMessages(id);
    } catch {
      // Fallback: open the thread locally so it always works offline
      const localId = `local-${Date.now()}`;
      const isProject = newMode === "project";
      const local = {
        id: localId,
        kind: isProject ? "project" : "dm",
        title: isProject ? target : directory.find((d) => d.uid === target)?.displayName || "New DM",
        sub: isProject ? "project chat" : "new direct message",
        accent: isProject ? "bg-canary-soft" : "bg-skyish",
        lastMessage: newDraft,
        projectFullName: isProject ? target : null,
      };
      setThreads((t) => [local, ...t]);
      setMessages([{ id: `${localId}-1`, uid: "me", text: newDraft, at: new Date().toISOString() }]);
      setActiveId(localId);
      setShowNew(false);
      setTarget("");
      setNewDraft("");
    } finally {
      setSending(false);
    }
  }

  const convoTitle = useMemo(() => {
    if (!activeThread) return "";
    if (activeThread.kind === "project") return `${activeThread.projectName || activeThread.projectFullName || activeThread.title}`;
    if (activeThread.kind === "mentorship") return activeThread.title || "Mentorship";
    return activeThread.otherUser?.displayName || "Direct message";
  }, [activeThread]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading-brutal text-4xl text-ink">Inbox</h1>
          <p className="mt-2 font-medium text-ink/60">
            Direct messages, project discussions and mentorship threads.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-brutal rounded-none bg-canary px-5 py-2 text-ink hover:bg-canary">
          + New thread
        </button>
      </div>

      {!live && (
        <p className="mt-4 inline-block border-2 border-ink bg-canary-soft px-3 py-1.5 font-mono text-xs font-bold text-ink">
          demo conversations shown — firebase offline
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <section className="brutal bg-white">
          <p className="border-b-2 border-ink px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink/70">
            Conversations · {threads.length}
          </p>
          <ul className="max-h-[70vh] overflow-y-auto">
            {threads.map((t) => {
              const other = t.otherUser;
              const name =
                t.kind === "project"
                  ? t.projectName || t.title
                  : other?.displayName || other?.githubUsername || t.title;
              const sub =
                t.kind === "project"
                  ? "project chat"
                  : t.kind === "mentorship"
                    ? "mentorship"
                    : `${other?.level || "dev"} · ${other?.primaryLanguage || "open source"}`;
              return (
                <li key={t.id} className="border-b-2 border-ink/10">
                  <button
                    onClick={() => setActiveId(t.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                      activeId === t.id ? "bg-ink" : "hover:bg-canvas"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center border-2 border-ink text-sm font-extrabold ${
                        t.accent || "bg-lava"
                      } ${activeId === t.id ? "text-ink" : "text-ink"}`}
                    >
                      {(other?.photoURL ? "◎" : name?.slice(0, 1).toUpperCase()) || "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-extrabold uppercase tracking-tight ${activeId === t.id ? "text-canvas" : "text-ink"}`}>
                        {name}
                      </span>
                      <span className={`block truncate font-mono text-[11px] ${activeId === t.id ? "text-canvas/60" : "text-ink/50"}`}>
                        {t.lastMessage || sub}
                      </span>
                    </span>
                    <span className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${activeId === t.id ? "border-canvas bg-canary text-ink" : "border-ink bg-white"}`}>
                      {t.kind === "dm" ? "DM" : t.kind === "project" ? "PROJ" : "MENT"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Chat panel */}
        <section className="brutal flex h-[70vh] flex-col bg-canvas">
          <div className="flex items-center justify-between border-b-2 border-ink bg-white px-4 py-3">
            <div>
              <p className="font-extrabold uppercase tracking-tight text-ink">{convoTitle || "Select a conversation"}</p>
              <p className="font-mono text-[11px] text-ink/50">
                {activeThread?.kind === "project"
                  ? `discussion · ${activeThread.projectOwner || ""}`
                  : activeThread?.kind === "dm"
                    ? `dm · ${activeThread.otherUser?.githubUsername || activeThread.otherUser?.email || ""}`
                    : "mentorship · guided check-ins"}
              </p>
            </div>
            {activeThread?.kind === "project" && activeThread.projectFullName && (
              <span className="badge-brutal bg-canary-soft px-2 py-1 text-[10px] text-ink">{activeThread.projectFullName}</span>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center font-mono text-sm text-ink/50">
                No messages yet — say hi 👋
              </p>
            ) : (
              messages.map((msg) => {
                const mine = msg.uid === user?.uid || msg.uid === "me";
                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] border-2 border-ink px-4 py-2 shadow-[3px_3px_0_#171717] ${mine ? "bg-ink" : "bg-white"}`}>
                      <p className={`whitespace-pre-wrap text-sm font-medium ${mine ? "text-canvas" : "text-ink"}`}>{msg.text}</p>
                      <p className={`mt-1 text-right font-mono text-[10px] ${mine ? "text-canvas/50" : "text-ink/40"}`}>
                        {msg.at ? timeShort(msg.at) : "now"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t-2 border-ink bg-white p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="input-brutal flex-1 px-3 py-2"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className="btn-brutal rounded-none bg-canary px-5 py-2 text-ink hover:bg-canary disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_#171717] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </section>
      </div>

      {/* New thread modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
          <motion.form
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={startThread}
            className="w-full max-w-md border-2 border-ink bg-canvas p-6 shadow-[6px_6px_0_#171717]"
          >
            <div className="flex items-center justify-between">
              <h3 className="heading-brutal text-2xl text-ink">New thread</h3>
              <button type="button" onClick={() => setShowNew(false)} className="btn-brutal rounded-none bg-coral px-3 py-1.5 text-ink hover:bg-coral">
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewMode("dm")}
                className={`btn-brutal rounded-none px-3 py-2 ${newMode === "dm" ? "bg-ink text-canvas" : "bg-white text-ink"}`}
              >
                Direct message
              </button>
              <button
                type="button"
                onClick={() => setNewMode("project")}
                className={`btn-brutal rounded-none px-3 py-2 ${newMode === "project" ? "bg-ink text-canvas" : "bg-white text-ink"}`}
              >
                Project chat
              </button>
            </div>

            {newMode === "dm" ? (
              <div className="mt-4">
                <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-ink/70">Send to</label>
                <select value={target} onChange={(e) => setTarget(e.target.value)} required className="input-brutal px-3 py-2">
                  <option value="">Choose a developer…</option>
                  {directory.map((d) => (
                    <option key={d.uid} value={d.uid}>
                      {d.displayName || d.githubUsername || d.uid} {d.primaryLanguage ? `· ${d.primaryLanguage}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-4">
                <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-ink/70">Project</label>
                <select value={target} onChange={(e) => setTarget(e.target.value)} required className="input-brutal px-3 py-2">
                  <option value="">Choose a saved project…</option>
                  {savableIds.map((p) => (
                    <option key={p.id || `${p.owner}/${p.name}`} value={p.id || `${p.owner}/${p.name}`}>
                      {p.owner}/{p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="mt-4 block text-[11px] font-extrabold uppercase tracking-wide text-ink/70">First message</label>
            <textarea
              value={newDraft}
              onChange={(e) => setNewDraft(e.target.value)}
              rows={3}
              required
              placeholder={newMode === "dm" ? "Hey! Saw we both saved the same repo — want to pair?" : "Let's talk about this project — I'd like to contribute."}
              className="input-brutal mt-1 px-3 py-2"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="btn-brutal rounded-none bg-white px-5 py-2 text-ink">
                Cancel
              </button>
              <button type="submit" disabled={sending} className="btn-brutal rounded-none bg-canary px-5 py-2 text-ink hover:bg-canary disabled:opacity-40">
                {sending ? "Sending…" : "Start thread"}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}

function timeShort(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}