import {
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./config";

const githubProvider = new GithubAuthProvider();
githubProvider.addScope("read:user");
githubProvider.addScope("repo");
githubProvider.addScope("public_repo");
githubProvider.setCustomParameters({ prompt: "select_account" });

const googleProvider = new GoogleAuthProvider();

export async function signInWithGitHub() {
  const result = await signInWithPopup(auth, githubProvider);
  return result.user;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export function getGitHubToken() {
  // There is no public API to read the OAuth access token back from
  // firebase/auth after a provider popup in the browser SDK. For live
  // GitHub API data, exchange on the backend instead (Cloud Function)
  // or accept a PAT in the profile settings.
  return null;
}