/* eslint-disable react-refresh/only-export-components -- the provider + useAuth hook must live together */
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserDoc, createUserProfile, fetchRecentContributions } from "../firebase/db";
import { signInWithGitHub, signInWithGoogle, signOutUser } from "../firebase/auth";
import { computeBadges } from "../lib/badges";
import { BASE_STATS, deriveStats } from "../lib/stats";

const AuthContext = createContext(null);

function enrichProfile(profile, contributions) {
  const stats = deriveStats(contributions, profile?.stats);
  const enriched = {
    ...(profile || {}),
    stats,
    contributions: contributions.map((c) => ({ type: c.type, repo: c.repo, at: c.at })).slice(0, 100),
  };
  enriched.badges = computeBadges(enriched);
  return enriched;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        let userProfile = null;
        try {
          userProfile = await getUserDoc(firebaseUser.uid);
        } catch (err) {
          console.error("[devcollab] failed to load user profile", err);
          userProfile = null;
        }
        if (!userProfile) {
          userProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            provider: firebaseUser.providerData?.[0]?.providerId || "unknown",
            githubUsername: "",
            level: "beginner",
            primaryLanguage: "",
            languages: [],
            goals: "",
            interests: [],
            contributionTypes: [],
            availability: "",
            stats: BASE_STATS,
            badges: [],
            onboardingComplete: false,
            createdAt: new Date().toISOString(),
          };
          await createUserProfile(firebaseUser.uid, userProfile);
        }
        let contributions = [];
        try {
          contributions = await fetchRecentContributions(firebaseUser.uid, 200);
        } catch (err) {
          console.error("[devcollab] failed to load contributions", err);
          contributions = [];
        }
        setProfile(enrichProfile(userProfile, contributions));
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleGitHubLogin() {
    const fbUser = await signInWithGitHub();
    const gh = fbUser.providerData?.find((p) => p.providerId === "github.com");
    if (gh?.uid) {
      await createUserProfile(fbUser.uid, { githubUsername: gh.uid });
    }
    return fbUser;
  }

  async function handleGoogleLogin() {
    return signInWithGoogle();
  }

  async function handleLogout() {
    await signOutUser();
  }

  function updateProfile(patch) {
    setProfile((prev) => {
      const next = { ...(prev || {}), ...patch };
      next.stats = deriveStats(next.contributions || [], next.stats);
      next.badges = computeBadges(next);
      return next;
    });
  }

  function refreshProfile(p) {
    updateProfile(p);
  }

  function mergeContributions(newContributions) {
    setProfile((prev) => {
      const existing = prev?.contributions || [];
      const byId = new Map(existing.map((c) => [`${c.type}_${c.repo}_${c.at}`, c]));
      newContributions.forEach((c) => byId.set(`${c.type}_${c.repo}_${c.at}`, c));
      const merged = [...byId.values()].slice(0, 200);
      const next = { ...(prev || {}), contributions: merged };
      next.stats = deriveStats(merged, prev?.stats);
      next.badges = computeBadges(next);
      return next;
    });
  }

  const value = {
    user,
    profile,
    loading,
    refreshProfile,
    updateProfile,
    mergeContributions,
    signInWithGitHub: handleGitHubLogin,
    signInWithGoogle: handleGoogleLogin,
    signOut: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}