import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const ADVANCED_LINKS = [
  { to: "/bounties", emoji: "💰", label: "Bounty board" },
  { to: "/teams", emoji: "👥", label: "Teams" },
  { to: "/mentorship", emoji: "🧭", label: "Mentorship" },
  { to: "/maintainer", emoji: "🏗️", label: "Maintainer" },
  { to: "/portfolio", emoji: "🔗", label: "Portfolio" },
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
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      isActive ? "bg-brand-100 text-brand-600" : "text-slate-600 hover:text-slate-900"
    }`;

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <motion.span
            whileHover={{ rotate: 8 }}
            className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm"
          >
            🧲
          </motion.span>
          DevCollab
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NavLink to="/discovery" className={linkClass}>
                Discover
              </NavLink>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  Explore <span className={`text-xs ${open ? "rotate-180" : ""} transition`}>▾</span>
                </button>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                  >
                    {ADVANCED_LINKS.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span className="text-base">{l.emoji}</span> {l.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>

              {!profile?.onboardingComplete && (
                <NavLink to="/onboarding" className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700">
                  Finish setup
                </NavLink>
              )}

              <NavLink to="/profile" className="flex items-center gap-2" title={profile?.displayName}>
                {profile?.photoURL || user?.photoURL ? (
                  <img src={profile?.photoURL || user?.photoURL} alt="avatar" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                    {(profile?.displayName || user?.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </NavLink>
              <button
                onClick={handleLogout}
                className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 sm:block"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}