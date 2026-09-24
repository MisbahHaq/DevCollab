// DevCollab Cloud Functions — production backend bits.
//
// `api` is a minimal HTTP proxy for the GitHub REST API. The browser calls
// this instead of api.github.com, so the Personal Access Token never ships to
// clients and the unauthenticated 60/hr rate limit stops rate-limiting real
// users. The token is injected server-side via the Secret Manager binding
// set in firebase.json — it is never exposed to the browser.
//
//   firebase deploy --only functions
//
// The Vite client routes GitHub traffic through this endpoint when
// VITE_GITHUB_PROXY_URL is set (see .env.example).

import { onRequest } from "firebase-functions/v2/https";

// We only ever forward GET requests to this narrow set of GitHub API paths so
// the function can't be abused as an open relay. Everything else is rejected.
const ALLOWED = /^\/(repos|users|search|issues|orgs)\//;

export const api = onRequest({ maxInstances: 10 }, async (req, res) => {
  const origin = req.headers.origin;
  res.set("Access-Control-Allow-Origin", origin || "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const path = typeof req.query.path === "string" ? req.query.path : "";
  if (!path.startsWith("/") || !ALLOWED.test(path) || /\/\//.test(path)) {
    res.status(400).json({ error: "Bad proxy path." });
    return;
  }
  const token = process.env.DEVCOLLAB_GITHUB_TOKEN;
  if (!token) {
    res.status(503).json({ error: "GitHub proxy token not configured." });
    return;
  }

  try {
    const upstream = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${token}`,
      },
    });
    const text = await upstream.text();
    res.status(upstream.status).set("Content-Type", "application/json").send(text);
  } catch (err) {
    console.error("[devcollab-fn] github proxy failed", err);
    res.status(502).json({ error: "GitHub proxy upstream request failed." });
  }
});
