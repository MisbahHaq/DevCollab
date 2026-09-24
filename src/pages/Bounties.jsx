import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { fetchBounties, claimBounty, unclaimBounty, createBounty } from "../firebase/db";
import { sampleBounties } from "../data/sampleData";

const DIFF_STYLES = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700",
};

export default function Bounties() {
  const { user } = useAuth();
  const [bounties, setBounties] = useState([]);
  const [live, setLive] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [stack, setStack] = useState("");
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", projectName: "", amount: "", currency: "USD", techStack: "", difficulty: "easy", description: "" });

  useEffect(() => {
    fetchBounties()
      .then((b) => {
        if (b.length) {
          setBounties(b);
          setLive(true);
        } else {
          setBounties(sampleBounties);
        }
      })
      .catch(() => setBounties(sampleBounties));
  }, []);

  async function toggleClaim(b) {
    if (b.claimedBy === user.uid) {
      await unclaimBounty(b.id);
      setBounties((bs) => bs.map((x) => (x.id === b.id ? { ...x, claimedBy: null, status: "open" } : x)));
    } else {
      await claimBounty(b.id, user.uid);
      setBounties((bs) => bs.map((x) => (x.id === b.id ? { ...x, claimedBy: user.uid, status: "claimed" } : x)));
    }
  }

  async function postBounty(e) {
    e.preventDefault();
    setPosting(true);
    try {
      const data = {
        ...form,
        amount: Number(form.amount),
        techStack: form.techStack.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const id = await createBounty(user.uid, data);
      setBounties((bs) => [{ id, ...data, status: "open", claimedBy: null, createdAt: new Date().toISOString() }, ...bs]);
      setShowForm(false);
      setForm({ title: "", projectName: "", amount: "", currency: "USD", techStack: "", difficulty: "easy", description: "" });
    } catch {} finally {
      setPosting(false);
    }
  }

  const stacks = [...new Set(bounties.flatMap((b) => b.techStack || []))].sort();

  const filtered = bounties.filter((b) => {
    if (minAmount && b.amount < Number(minAmount)) return false;
    if (stack && !(b.techStack || []).includes(stack)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bounty board</h1>
          <p className="mt-1 text-slate-600">
            Paid or credit-backed issues from maintainers.{" "}
            {live ? "Live from Firestore." : "Showing sample bounties — post your own or enable Firestore."}
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          {showForm ? "Close" : "+ Post a bounty"}
        </button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={postBounty} className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Issue title" className={inputClass} />
          <input required value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="Project name" className={inputClass} />
          <input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" className={inputClass} />
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputClass}>
            {["USD", "EUR", "INR", "CRED"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} placeholder="Stack: TypeScript, React" className={inputClass} />
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={inputClass}>
            {["easy", "medium", "hard"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Scope and acceptance criteria" className={`${inputClass} sm:col-span-2`} rows={2} />
          <button type="submit" disabled={posting} className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 sm:col-span-2">
            {posting ? "Posting..." : "Post bounty"}
          </button>
        </motion.form>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <input type="number" placeholder="Min amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className={`${inputClass} w-36`} />
        <select value={stack} onChange={(e) => setStack(e.target.value)} className={`${inputClass} max-w-xs`}>
          <option value="">Any stack</option>
          {stacks.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {filtered.map((b) => {
          const mine = b.claimedBy === user.uid;
          return (
            <motion.article key={b.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{b.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">🎯 {b.projectName || b.projectUrl}</p>
                </div>
                <div className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-2 text-right">
                  <p className="text-xl font-bold text-emerald-600">{b.currency} {b.amount?.toLocaleString?.() ?? b.amount}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{b.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(b.techStack || []).map((s) => (
                  <span key={s} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">{s}</span>
                ))}
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${DIFF_STYLES[b.difficulty]}`}>{b.difficulty}</span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${b.status === "open" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>
                  {b.status === "open" ? "open" : "claimed"}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">Posted {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "recently"}</span>
                <button
                  onClick={() => toggleClaim(b)}
                  className={`rounded-full px-5 py-2 text-xs font-semibold transition ${
                    b.status === "claimed" && !mine
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : mine
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-emerald-500 text-white hover:bg-emerald-600"
                  }`}
                  disabled={b.status === "claimed" && !mine}
                >
                  {mine ? "Claimed by you — unclaim" : b.status === "claimed" ? "Claimed by someone else" : "Claim bounty"}
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center text-slate-500">
          <p className="text-4xl">💰</p>
          <p className="mt-3 font-medium">No bounties match those filters.</p>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";