import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import SearchBox from "./SearchBox";

const EXPLORE_LINKS = [
  { to: "/bounties", label: "Bounty board", accent: "bg-canary-soft" },
  { to: "/teams", label: "Teams", accent: "bg-mint" },
  { to: "/mentorship", label: "Mentorship", accent: "bg-lava" },
  { to: "/maintainer", label: "Maintainer", accent: "bg-coral" },
  { to: "/portfolio", label: "Portfolio", accent: "bg-skyish" },
];

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const linkClass = ({ isActive }) =>
    `btn-brutal rounded-none px-3 py-1.5 ${
      isActive ? "bg-ink text-canvas" : "bg-canvas text-ink hover:bg-canary-soft"
    }`;

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-canvas">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center border-2 border-ink bg-canary text-sm shadow-[3px_3px_0_#171717] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">
            🧲
          </span>
          <span className="text-base font-extrabold uppercase tracking-tight text-ink">
            Dev<span className="bg-black px-0.5 text-canary">Collab</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <SearchBox />
          {user ? (
            <>
              <NavLink to="/discovery" className={linkClass}>
                Discover
              </NavLink>
              <NavLink to="/saved" className={linkClass}>
                ⭐ Saved
              </NavLink>
              <NavLink to="/messages" className={linkClass}>
                💬 Chat
              </NavLink>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="btn-brutal rounded-none bg-ink px-3 py-1.5 text-canvas"
                >
                  More <span className={`inline-block transition ${open ? "rotate-180" : ""}`}>▾</span>
                </button>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 border-2 border-ink bg-canvas shadow-[4px_4px_0_#171717]"
                  >
                    {EXPLORE_LINKS.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between border-b-2 border-ink/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-tight text-ink transition hover:bg-ink hover:text-canvas"
                      >
                        {l.label}
                        <span className={`h-3 w-3 border-2 border-ink ${l.accent}`} />
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>

              {!profile?.onboardingComplete && (
                <NavLink to="/onboarding" className="btn-brutal rounded-none bg-coral px-3 py-1.5 text-ink hover:bg-coral">
                  Finish setup
                </NavLink>
              )}

              <NavLink to="/profile" className="ml-1" title={profile?.displayName}>
                {profile?.photoURL || user?.photoURL ? (
                  <img
                    src={profile?.photoURL || user?.photoURL}
                    alt="avatar"
                    className="h-9 w-9 border-2 border-ink object-cover shadow-[3px_3px_0_#171717] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="grid h-9 w-9 place-items-center border-2 border-ink bg-lava text-sm font-extrabold text-ink shadow-[3px_3px_0_#171717] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">
                    {(profile?.displayName || user?.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </NavLink>
              <button
                onClick={handleLogout}
                className="btn-brutal hidden rounded-none bg-skyish px-3 py-1.5 text-ink hover:bg-skyish sm:block"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-brutal rounded-none bg-ink px-5 py-2 text-canvas hover:bg-ink">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}