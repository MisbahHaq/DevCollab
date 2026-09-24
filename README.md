# DevCollab

**Tinder for open source.** Match contributors with real, currently-active open source projects based on their tech stack, experience level, and goals — then take them from "found a repo" to "landed a PR" in hours instead of weeks.

## What it does

- **Discovery feed** — a swipe-style feed of real GitHub repos with good-first-issue tracking. Every project gets a **match score** (0–100%) computed from your skills, languages, level, goals and contribution history, with a transparent "why you match" breakdown.
- **Search** — instant global search in the navbar (projects match by owner, name, language, framework, or topic) plus a keyword box + filters (language / difficulty / size / sort) on the Discovery page. Offline-safe with a ~50 repo seed catalog.
- **Bookmarks & likes** — ☆ to shortlist a project (persisted to your account), ♥ to tell a maintainer you're interested, pass to train future matches. All saved to `/saved`.
- **Mission control dashboard** (`/dashboard`) — activity feed of recent matches, bounties and team openings, plus live charts of your contribution activity, top saved stars and contribution mix (Recharts).
- **Chat & DMs** (`/messages`) — async conversations split into **project discussions**, **direct messages** and **mentorship threads**, with a modal to start new threads.
- **Bounties** — paid or credit-backed issues posted by maintainers, with claiming.
- **Teams** — build a team around a project, find co-contributors, assign issues, and run a mini leaderboard.
- **Mentorship** — request a mentor for your stack or offer yourself as one; check-ins run through the same thread/message system.
- **Maintainer dashboard** — publish your own projects to the contributor pool and review incoming contribution requests.
- **Portfolio** — auto-built public profile from your contributions, badges and skill stack.
- **Profile** — GitHub stats, monthly goal tracker, skill badges, contribution timeline, and a one-click GitHub activity sync (with optional fine-grained token to lift API rate limits).

## Design

Neo-brutalist: warm off-white canvas (`#faf7f2`), ink-black borders (`border-2 border-black`) with hard offset shadows, tactile press-down buttons, a canary/lavender/mint/coral/sky accent palette, uppercase display type (Space Grotesk) and JetBrains Mono for numbers.

## Tech stack

- **React 19 + Vite 8** — single-page app, code-split routes
- **Tailwind CSS v4** — theme tokens + brutalist component classes in `src/index.css`
- **Framer Motion** — page transitions and card animations
- **Firebase** (Auth + Firestore) — GitHub/Google OAuth, user profiles, projects, matches, saved projects, threads & messages, teams, bounties
- **Recharts** — dashboard charts
- **GitHub REST API** — live project pool, issues, onboarding guides, contribution events

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # serve the production build
```

Firebase is optional for a full demo: with Firestore/API keys configured it uses live data everywhere; without them the app degrades gracefully to seed content (projects, bounties, mentors, demo conversations).

### Firebase setup

1. Copy `.env.example` to `.env` and fill in your Firebase web-app keys (`VITE_FIREBASE_API_KEY`, project id, auth domain, etc.).
2. Deploy security rules + indexes from the repo root:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

3. Optional: paste a fine-grained GitHub PAT (public-repo read) in *Profile → GitHub API token* to lift the anonymous rate limit.

## Project structure

```
src/
├── components/     # Navbar, SearchBox, ProjectCard, Filters, MatchScoreBar
├── context/        # AuthContext (user profile, badges, stats, contributions)
├── data/           # seed fallbacks: mockProjects (search catalog), sampleData
├── firebase/       # config, auth, db (Firestore helpers), githubService (GitHub API)
├── lib/            # matchScore algorithm, badges computation
└── pages/          # Landing, Discovery, Dashboard, Messages, Saved, ProjectDetail,
                    # Profile, Portfolio, Onboarding, Login, Maintainer, Teams,
                    # Bounties, Mentorship
```

## Data model

Key Firestore collections: `users`, `projects`, `projects_issues`, `matches`, `contributions`, `saved_projects`, `project_requests`, `teams`, `bounties`, `mentorships`, `threads`, `messages`.