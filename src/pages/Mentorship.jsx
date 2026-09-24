import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  fetchMentors,
  fetchMyMentorships,
  requestMentorship,
  fetchThreadMessages,
  sendMessage,
  updateUserProfile,
} from "../firebase/db";
import { sampleMentors } from "../data/sampleData";

export default function Mentorship() {
  const { user, profile, refreshProfile } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [liveMentors, setLiveMentors] = useState(false);
  const [mentorships, setMentorships] = useState([]);
  const [openThread, setOpenThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [request, setRequest] = useState(null);
  const [requestMsg, setRequestMsg] = useState("");
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async (threadId) => {
    if (!threadId) return;
    try {
      const msgs = await fetchThreadMessages(threadId);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }, []);

  const loadMentorships = useCallback(async () => {
    try {
      const m = await fetchMyMentorships(user.uid);
      setMentorships(m);
      if (m.length && !openThread) {
        setOpenThread(m[0].threadId);
      }
    } catch {}
  }, [user, openThread]);

  useEffect(() => {
    fetchMentors()
      .then((list) => {
        if (list.length) {
          setMentors(list);
          setLiveMentors(true);
        } else {
          setMentors(sampleMentors);
        }
      })
      .catch(() => setMentors(sampleMentors));
    if (user) {
      loadMentorships();
    }
  }, [user, loadMentorships]);

  useEffect(() => {
    if (openThread) loadMessages(openThread);
    const id = setInterval(() => openThread && loadMessages(openThread), 8000);
    return () => clearInterval(id);
  }, [openThread, loadMessages]);

  async function handleRequest(mentor) {
    setSending(true);
    try {
      const threadId = await requestMentorship(user.uid, mentor.uid || mentor.id, null, requestMsg);
      setOpenThread(threadId);
      setRequest(null);
      setRequestMsg("");
      loadMessages(threadId);
      loadMentorships();
    } catch {
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (!draft.trim() || !openThread) return;
    await sendMessage(openThread, user.uid, draft);
    setDraft("");
    loadMessages(openThread);
  }

  async function toggleMentorStatus() {
    const available = !profile?.mentor?.available;
    await updateUserProfile(user.uid, { mentor: { available, topics: profile?.languages || [] } });
    refreshProfile({ mentor: { available, topics: profile?.languages || [] } });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mentorship pairing</h1>
          <p className="mt-1 text-slate-600">
            Get a guided first contribution or offer one. Async chat with code-review threads.
          </p>
        </div>
        <button
          onClick={toggleMentorStatus}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            profile?.mentor?.available ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-900 text-white hover:bg-slate-700"
          }`}
        >
          {profile?.mentor?.available ? "🟢 Available as mentor — stop" : "Offer to mentor"}
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Mentors for your stack</h2>
          {!liveMentors && <p className="mt-1 text-xs text-amber-600">Sample mentors shown — sign up as a mentor to populate the directory.</p>}
          <ul className="mt-4 space-y-3">
            {mentors.map((m) => (
              <li key={m.uid || m.id} className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="h-11 w-11 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                      {(m.displayName || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {m.displayName}
                      {m.githubUsername && <span className="ml-1 font-normal text-slate-400">@{m.githubUsername}</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{m.bio || "Open source mentor"}</p>
                  </div>
                  <button onClick={() => setRequest(m)} className="shrink-0 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                    Request
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(m.mentor?.topics || m.languages || []).map((t) => (
                    <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{t}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Your mentorship threads</h2>
          {mentorships.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Request a mentor on the left to start an async thread with code-review check-ins.
            </p>
          ) : (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {mentorships.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setOpenThread(m.threadId)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      openThread === m.threadId ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {m.project || "General"} · {m.status}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex h-80 flex-col rounded-2xl bg-slate-50">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <ChatBubble text="👋 Welcome! Tell me what you're working on and I'll point you at the right issue." from="other" />
                  {messages.map((msg) => (
                    <ChatBubble key={msg.id} text={msg.text} from={msg.uid === user.uid ? "me" : "other"} />
                  ))}
                </div>
                <div className="flex gap-2 border-t border-slate-200 p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask about a review, issue, or next step..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <button onClick={handleSend} disabled={!draft.trim()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {request && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6">
            <h3 className="font-bold text-slate-900">Request mentorship from {request.displayName}</h3>
            <p className="mt-1 text-sm text-slate-500">Share what you're trying to learn or which project drew you in.</p>
            <textarea
              value={requestMsg}
              onChange={(e) => setRequestMsg(e.target.value)}
              rows={4}
              placeholder="e.g. 'I want to land my first PR in a React repo and it's terrifying.'"
              className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRequest(null)} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400">
                Close
              </button>
              <button onClick={() => handleRequest(request)} disabled={sending} className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                {sending ? "Sending..." : "Send request"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ChatBubble({ text, from }) {
  return (
    <div className={`flex ${from === "me" ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
          from === "me" ? "bg-brand-500 text-white" : "bg-white text-slate-700 shadow-sm"
        }`}
      >
        {text}
      </p>
    </div>
  );
}