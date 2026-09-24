import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { fetchProjectPool } from "./firebase/githubService";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";

const Landing = lazy(() => import("./pages/Landing"));
const Discovery = lazy(() => import("./pages/Discovery"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Saved = lazy(() => import("./pages/Saved"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const Maintainer = lazy(() => import("./pages/Maintainer"));
const Teams = lazy(() => import("./pages/Teams"));
const Bounties = lazy(() => import("./pages/Bounties"));
const Mentorship = lazy(() => import("./pages/Mentorship"));

function RouteLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}

function Protected({ children, allowOnboarding }) {
  const { user, profile, loading } = useAuth();
  if (loading || (user && !profile)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!allowOnboarding && !profile?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    fetchProjectPool().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <ErrorBoundary key={location.pathname}>
        <Navbar />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {!loading && (
              <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/project/:owner/:name" element={<ProjectDetail />} />
                <Route
                  path="/dashboard"
                  element={
                    <Protected>
                      <Dashboard />
                    </Protected>
                  }
                />
                <Route
                  path="/saved"
                  element={
                    <Protected>
                      <Saved />
                    </Protected>
                  }
                />
                <Route
                  path="/discovery"
                  element={
                    <Protected>
                      <Discovery />
                    </Protected>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <Protected allowOnboarding>
                      <Onboarding />
                    </Protected>
                  }
                />
                <Route
                  path="/portfolio"
                  element={
                    <Protected>
                      <Portfolio />
                    </Protected>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Protected>
                      <Profile />
                    </Protected>
                  }
                />
                <Route
                  path="/maintainer"
                  element={
                    <Protected>
                      <Maintainer />
                    </Protected>
                  }
                />
                <Route
                  path="/teams"
                  element={
                    <Protected>
                      <Teams />
                    </Protected>
                  }
                />
                <Route
                  path="/bounties"
                  element={
                    <Protected>
                      <Bounties />
                    </Protected>
                  }
                />
                <Route
                  path="/mentorship"
                  element={
                    <Protected>
                      <Mentorship />
                    </Protected>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          )}
        </motion.main>
      </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}