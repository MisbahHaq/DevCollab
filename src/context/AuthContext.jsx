import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserDoc, createUserProfile, fetchRecentContributions } from "../firebase/db";
import { signInWithGitHub, signInWithGoogle, signOutUser } from "../firebase/auth";
import { computeBadges } from "../lib/badges";

const AuthContext = createContext(null);

function baseStats() {
  return { totalMerged: 0, totalOpened: 0, reviews: 0, docsMerged: 0, streak: 0 };
}

function enrichProfile(profile, contributions) {
  const stats = { ...baseStats(), ...(profile?.stats || {}) };
  for (const c of contributions) {
    switch (c.type) {
      case "merge":
        stats.totalMerged++;
        break;
      case "docs":
        stats.docsMerged++;
        break;
      case "review":
        stats.reviews++;
        break;
      default:
        stats.totalOpened++;
    }
  }
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
        } catch {
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
            stats: baseStats(),
            badges: [],
            onboardingComplete: false,
            createdAt: new Date().toISOString(),
          };
          await createUserProfile(firebaseUser.uid, userProfile);
        }
        let contributions = [];
        try {
          contributions = await fetchRecentContributions(firebaseUser.uid, 200);
        } catch {
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
      const contributions = next.contributions || [];
      const stats = { ...baseStats(), ...(next.stats || {}) };
      for (const c of contributions) {
        if (c.type === "merge") stats.totalMerged++;
        else if (c.type === "docs") stats.docsMerged++;
        else if (c.type === "review") stats.reviews++;
        else stats.totalOpened++;
      }
      next.stats = stats;
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
      next.stats = { ...baseStats(), ...(prev?.stats || {}) };
      merged.forEach((c) => {
        if (c.type === "merge") next.stats.totalMerged++;
        else if (c.type === "docs") next.stats.docsMerged++;
        else if (c.type === "review") next.stats.reviews++;
        else next.stats.totalOpened++;
      });
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