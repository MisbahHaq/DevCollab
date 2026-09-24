import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchProjectPool, searchGitHubProjects } from "../firebase/githubService";
import { fetchAllMaintainedProjects } from "../firebase/db";
import { mockProjects } from "../data/mockProjects";
import { projectMatchesQuery } from "../lib/search";

export default function SearchBox({ placeholder = "Search projects…" }) {
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState([]);
  const [open, setOpen] = useState(false);
  const [ghResults, setGhResults] = useState([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghFailed, setGhFailed] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      const source = await fetchProjectPool().catch(() => []);
      const posted = await fetchAllMaintainedProjects().catch(() => []);
      if (!alive) return;
      const known = new Set(source.map((p) => p.id));
      const merged = [...source];
      posted.forEach((p) => {
        if (!known.has(p.id)) merged.push({ ...p, maintainerPosted: true });
      });
      setPool(merged.length ? merged : mockProjects);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Debounced live GitHub search for anything the user types.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setGhResults([]);
      setGhLoading(false);
      setGhFailed(false);
      return;
    }
    setGhLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchGitHubProjects(q, { perPage: 12 });
        setGhResults(res);
        setGhFailed(false);
      } catch {
        setGhResults([]);
        setGhFailed(true);
      } finally {
        setGhLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    return pool.filter((p) => projectMatchesQuery(p, query)).slice(0, 6);
  }, [query, pool]);

  // Live GitHub results first, then local matched projects, deduped by repo id.
  const results = useMemo(() => {
    const seen = new Set();
    return [...ghResults, ...localResults]
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .slice(0, 8);
  }, [ghResults, localResults]);

  function goSearch(e) {
    if (e.key === "Enter" && query.trim()) {
      navigate(`/discovery?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }

  return (
    <div className="relative hidden md:block" ref={wrapRef}>
      <div className="flex items-center border-2 border-ink bg-white shadow-[3px_3px_0_#171717] transition focus-within:shadow-none">
        <span className="pl-2 text-sm">🔎</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={goSearch}
          placeholder={placeholder}
          className="w-40 bg-transparent px-2 py-1.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink/40 lg:w-52"
        />
        {query && (
          <button onClick={() => setQuery("")} className="px-2 text-xs font-bold text-ink/50 hover:text-ink">
            ✕
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 border-2 border-ink bg-canvas shadow-[4px_4px_0_#171717]">
          {ghLoading ? (
            <div className="flex items-center gap-2 px-4 py-4 font-mono text-xs text-ink/60">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              Searching GitHub…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4">
              <p className="font-mono text-xs text-ink/60">No matches for "{query}".</p>
              <p className="mt-1 font-mono text-[11px] text-ink/40">
                {ghFailed
                  ? "GitHub search unavailable (rate limit?) — try again in a moment."
                  : 'Try a repo name or language, e.g. "react", "python", or "next.js".'}
              </p>
            </div>
          ) : (
            <ul>
              {results.map((p) => {
                const live = ghResults.some((g) => g.id === p.id);
                return (
                  <li key={p.id} className="border-b-2 border-ink/10 last:border-b-0">
                    <Link
                      to={`/project/${p.owner}/${p.name}`}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-ink hover:text-canvas"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center border-2 border-ink bg-canary text-[11px] font-extrabold text-ink">
                        {p.owner?.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-extrabold uppercase tracking-tight text-ink">
                            {p.owner}/{p.name}
                          </span>
                          {live && (
                            <span className="shrink-0 border border-ink bg-lava px-1 font-mono text-[9px] font-bold uppercase text-ink">
                              live
                            </span>
                          )}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-ink/60">
                          ⭐ {formatCount(p.stars)} · {(p.languages || []).slice(0, 3).join(" · ") || "open source"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            onClick={() => {
              navigate(`/discovery?q=${encodeURIComponent(query.trim())}`);
              setOpen(false);
              setQuery("");
            }}
            className="btn-brutal block w-full rounded-none border-x-0 border-b-0 bg-canary px-4 py-2 text-left text-xs text-ink hover:bg-canary"
          >
            Browse all results →
          </button>
        </div>
      )}
    </div>
  );
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}