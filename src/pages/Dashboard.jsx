import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  fetchRecentMatches,
  fetchRecentBounties,
  fetchRecentTeams,
  fetchSavedProjectIds,
  fetchAllMaintainedProjects,
} from "../firebase/db";
import { fetchProjectPool, fetchUserEvents } from "../firebase/githubService";
import { mockProjects } from "../data/mockProjects";

const ACCENT = {
  yellow: "#fde047",
  lavender: "#e9d5ff",
  mint: "#a7f3d0",
  coral: "#fecdd3",
  sky: "#bae6fd",
};

const GH_EMOJI = {
  PushEvent: "💻",
  PullRequestEvent: "✨",
  IssuesEvent: "🐛",
  IssueCommentEvent: "💬",
  ReleaseEvent: "🚀",
  ForkEvent: "🍴",
  WatchEvent: "⭐",
  CreateEvent: "🧰",
  PullRequestReviewEvent: "🔍",
  PullRequestReviewCommentEvent: "🔍",
};

const GH_ACCENT = {
  PushEvent: ACCENT.sky,
  PullRequestEvent: ACCENT.mint,
  IssuesEvent: ACCENT.coral,
  IssueCommentEvent: ACCENT.lavender,
  ReleaseEvent: ACCENT.yellow,
  ForkEvent: ACCENT.lavender,
  WatchEvent: ACCENT.yellow,
  CreateEvent: ACCENT.sky,
  PullRequestReviewEvent: ACCENT.mint,
  PullRequestReviewCommentEvent: ACCENT.mint,
};

function githubFeedItems(events = []) {
  const items = [];
  events.forEach((e) => {
    const repo = e.repo || "";
    const payload = e.payload || {};
    let title = "";
    let meta = repo;
    switch (e.type) {
      case "PushEvent": {
        const n = payload.commits?.length || payload.size || 1;
        title = `Pushed ${n} ${n === 1 ? "commit" : "commits"} to ${repo}`;
        meta = (payload.ref || "").replace("refs/heads/", "") || repo;
        break;
      }
      case "PullRequestEvent": {
        const pr = payload.pull_request;
        const action = (payload.action || "opened").replace("_", " ");
        title = `PR ${action}: ${pr?.title || `#${pr?.number || "?"}`} in ${repo}`;
        meta = `${pr?.state || "open"} · ${repo}`;
        break;
      }
      case "IssuesEvent": {
        const iss = payload.issue;
        const action = (payload.action || "opened").replace("_", " ");
        title = `Issue ${action}: ${iss?.title || `#${iss?.number || "?"}`} in ${repo}`;
        break;
      }
      case "IssueCommentEvent": {
        const iss = payload.issue;
        title = `Commented on ${iss?.title ? `"${iss.title}"` : "an issue"} in ${repo}`;
        break;
      }
      case "ReleaseEvent":
        title = `Released ${payload.release?.tag_name || "a version"} in ${repo}`;
        break;
      case "ForkEvent":
        title = `Forked ${repo}`;
        break;
      case "WatchEvent":
        title = `Starred ${repo}`;
        break;
      case "CreateEvent":
        title = `Created a ${payload.ref_type || "ref"} in ${repo}`;
        meta = payload.ref || repo;
        break;
      case "PullRequestReviewEvent":
      case "PullRequestReviewCommentEvent":
        title = `Reviewed a PR in ${repo}`;
        break;
      default:
        return;
    }
    items.push({
      id: `gh_${e.id}`,
      ts: Date.parse(e.created_at) || 0,
      kind: "github",
      emoji: GH_EMOJI[e.type] || "⚡",
      accent: GH_ACCENT[e.type] || ACCENT.sky,
      title,
      meta,
      when: timeAgo(e.created_at),
    });
  });
  return items;
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-2 border-ink bg-canvas px-3 py-2 shadow-[3px_3px_0_#171717]">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono text-sm font-bold text-ink">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [feed, setFeed] = useState([]);
  const [live, setLive] = useState(false);
  const [saved, setSaved] = useState({});
  const [pool, setPool] = useState([]);

  const githubUsername = profile?.githubUsername;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [matches, bounties, teams, events] = await Promise.all([
          fetchRecentMatches(user.uid, 6).catch(() => []),
          fetchRecentBounties(6).catch(() => []),
          fetchRecentTeams(6).catch(() => []),
          githubUsername ? fetchUserEvents(githubUsername, 30).catch(() => []) : [],
        ]);
        if (!alive) return;
        const projectPool = await fetchProjectPool().catch(() => []);
        const posted = await fetchAllMaintainedProjects().catch(() => []);
        if (!alive) return;
        const all = [...projectPool, ...posted.map((p) => ({ ...p, maintainerPosted: true }))];
        const byId = new Map(all.map((p) => [p.id, p]));

        const items = githubFeedItems(events);
        matches.forEach((m) => {
          const p = byId.get(m.projectId);
          items.push({
            id: `m_${m.id}`,
            ts: Date.parse(m.computedAt) || 0,
            kind: "match",
            emoji: "🧲",
            title: `New ${m.score}% match — ${p ? `${p.owner}/${p.name}` : m.projectId}`,
            meta: p ? `${p.languages?.join(" · ") || "Open source"} · good first issues 🌱` : "Open source",
            when: timeAgo(m.computedAt),
            accent: ACCENT.yellow,
          });
        });
        bounties.slice(0, 4).forEach((b) => {
          items.push({
            id: `b_${b.id}`,
            ts: Date.parse(b.createdAt) || 0,
            kind: "bounty",
            emoji: "💰",
            title: `${b.currency} ${Number(b.amount || 0).toLocaleString()} bounty — ${b.title}`,
            meta: `${b.projectName || "open source"} · ${b.difficulty}`,
            when: timeAgo(b.createdAt),
            accent: ACCENT.mint,
          });
        });
        teams.slice(0, 4).forEach((t) => {
          items.push({
            id: `t_${t.id}`,
            ts: Date.parse(t.createdAt) || 0,
            kind: "team",
            emoji: "👥",
            title: `Team “${t.name}” forming`,
            meta: `${t.projectName || "cross-project"} · ${Object.keys(t.members || {}).length} members`,
            when: timeAgo(t.createdAt),
            accent: ACCENT.lavender,
          });
        });

        items.sort((a, b) => b.ts - a.ts);
        if (items.length) {
          setFeed(items.slice(0, 12));
          setLive(true);
        }
        setPool(all);
      } catch (err) {
        console.error("[devcollab] failed to build activity feed", err);
      }
    })();

    fetchSavedProjectIds(user.uid)
      .then((m) => alive && setSaved(m))
      .catch((err) => console.error("[devcollab] failed to load saved projects", err));

    return () => {
      alive = false;
    };
  }, [user, githubUsername]);

  const stats = useMemo(() => {
    const s = profile?.stats || {};
    return [
      { label: "Matches", value: feed.filter((f) => f.kind === "match").length || "—", accent: "bg-canary-soft" },
      { label: "Saved", value: Object.values(saved).filter((a) => a === "like" || a === "bookmark").length, accent: "bg-mint" },
      { label: "PRs merged", value: s.totalMerged ?? "—", accent: "bg-lava" },
      { label: "Streak", value: `${s.streak ?? 0}d`, accent: "bg-skyish" },
    ];
  }, [feed, saved, profile]);

  const quickLinks = [
    { to: "/discovery", label: "Discover", emoji: "🧲", accent: "bg-canary-soft" },
    { to: "/saved", label: "Bookmarks", emoji: "⭐", accent: "bg-mint" },
    { to: "/mentorship", label: "Mentorship", emoji: "🧭", accent: "bg-lava" },
    { to: "/bounties", label: "Bounties", emoji: "💰", accent: "bg-coral" },
  ];

  // --- Chart data ---
  const activity = useMemo(() => {
    const contributions = profile?.contributions || [];
    const days = 14;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (days - 1 - i));
      return { name: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }), count: 0 };
    });
    const today = new Date();
    contributions.forEach((c) => {
      const at = new Date(c.at);
      const idx = Math.round((today - at) / 86400000);
      const target = days - 1 - idx;
      if (target >= 0 && target < days) buckets[target].count++;
    });
    return buckets;
  }, [profile]);

  const topSaved = useMemo(() => {
    const ids = Object.entries(saved).filter(([, a]) => a === "like" || a === "bookmark").map(([id]) => id);
    const source = pool.length ? pool : mockProjects.slice(0, 8);
    return source
      .filter((p) => ids.length === 0 || ids.includes(p.id))
      .map((p) => ({ name: p.name, stars: p.stars || 0 }))
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 6);
  }, [saved, pool]);

  const mix = useMemo(() => {
    const s = profile?.stats || {};
    return [
      { name: "Merged", value: s.totalMerged || 0, fill: ACCENT.mint },
      { name: "Opened", value: s.totalOpened || 0, fill: ACCENT.sky },
      { name: "Reviews", value: s.reviews || 0, fill: ACCENT.lavender },
      { name: "Docs", value: s.docsMerged || 0, fill: ACCENT.coral },
    ].filter((d) => d.value > 0);
  }, [profile]);

  const noLiveCharts = useMemo(
    () => activity.every((d) => d.count === 0) && mix.length === 0 && topSaved.length === 0,
    [activity, mix, topSaved]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading-brutal text-4xl text-ink">Mission control</h1>
          <p className="mt-2 font-medium text-ink/60">
            Recent matches, bounties and team openings — plus your contribution pulse.
          </p>
        </div>
        <span className={`badge-brutal px-3 py-1 text-[11px] ${live ? "bg-mint text-ink" : "bg-canary-soft text-ink"}`}>
          {live ? "● Live activity" : "● No activity yet"}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`brutal ${s.accent} p-4`}>
            <p className="font-mono text-3xl font-bold leading-none text-ink">{s.value}</p>
            <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-ink/70">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className={`brutal-press brutal-sm ${q.accent} flex items-center justify-between px-4 py-3`}
          >
            <span className="text-sm font-extrabold uppercase tracking-tight text-ink">{q.label}</span>
            <span className="text-lg">{q.emoji}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">Activity feed</h2>
            {!live && <span className="font-mono text-[11px] text-ink/50">no activity to show</span>}
          </div>
          {feed.length === 0 ? (
            <Placeholder
              title="No activity yet"
              hint="Sign in with GitHub and push a PR — your commits, issues and reviews show up here, live."
            />
          ) : (
            <ul className="space-y-3">
              {feed.map((f, i) => (
                <motion.li
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="brutal flex items-center gap-4 bg-white p-4"
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center border-2 border-ink text-lg font-bold ${f.accent}`}>
                    {f.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold uppercase tracking-tight text-ink">{f.title}</p>
                    <p className="truncate font-mono text-xs text-ink/60">{f.meta}</p>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-ink/50">{f.when}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink">Top saved stars</h2>
          {topSaved.length === 0 ? (
            <Placeholder title="No saved projects" hint="Like or bookmark projects to chart their stars here." />
          ) : (
            <div className="brutal bg-white p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSaved} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "#171717", strokeWidth: 2 }} interval={0} angle={-20} height={40} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "#171717", strokeWidth: 2 }} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="stars" name="stars" fill={ACCENT.mint} stroke="#171717" strokeWidth={1.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink">Contribution activity · 14d</h2>
          <div className="brutal bg-white p-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="inkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fde047" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#fde047" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "#171717", strokeWidth: 2 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "#171717", strokeWidth: 2 }} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" name="contributions" stroke="#171717" strokeWidth={2} fill="url(#inkFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {noLiveCharts && (
              <p className="mt-3 border-t-2 border-ink/10 pt-3 font-mono text-[11px] text-ink/50">
                Push contributions appear once you sign in with GitHub and ship your first PR.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink">Contribution mix</h2>
          {mix.length === 0 ? (
            <Placeholder title="Nothing shipped yet" hint="Your merged PRs, opened issues and reviews land here." />
          ) : (
            <div className="brutal bg-white p-4">
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={3} stroke="#171717" strokeWidth={1.5}>
                      {mix.map((d) => (
                        <Cell key={d.name} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <p className="font-mono text-2xl font-bold text-ink">{mix.reduce((a, b) => a + b.value, 0)}</p>
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {mix.map((d) => (
                  <li key={d.name} className="flex items-center justify-between font-mono text-xs">
                    <span className="flex items-center gap-2 text-ink/70">
                      <span className="h-2.5 w-2.5 border border-ink" style={{ backgroundColor: d.fill }} /> {d.name}
                    </span>
                    <span className="font-bold text-ink">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Placeholder({ title, hint }) {
  return (
    <div className="brutal grid h-48 place-items-center bg-white p-4 text-center">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">{title}</p>
        <p className="mx-auto mt-1 max-w-[220px] text-xs text-ink/50">{hint}</p>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "recently";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}