import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./config";

export const COLLECTIONS = {
  USERS: "users",
  PROJECTS: "projects",
  PROJECT_ISSUES: "project_issues",
  MATCHES: "matches",
  CONTRIBUTIONS: "contributions",
  SAVED_PROJECTS: "saved_projects",
  BADGES: "badges",
  PROJECT_REQUESTS: "project_requests",
  TEAMS: "teams",
  BOUNTIES: "bounties",
  MENTORSHIPS: "mentorships",
  THREADS: "threads",
  MESSAGES: "messages",
};

const userRef = (uid) => doc(db, COLLECTIONS.USERS, uid);

export async function getUserDoc(uid) {
  return (await getDoc(userRef(uid))).data();
}

export async function createUserProfile(uid, data) {
  await setDoc(userRef(uid), data, { merge: true });
}

export async function updateUserProfile(uid, data) {
  await updateDoc(userRef(uid), data);
}

export async function deleteUserProfile(uid) {
  await deleteDoc(userRef(uid));
}

export async function saveProjectForUser(uid, projectId) {
  await setDoc(doc(db, COLLECTIONS.SAVED_PROJECTS, `${uid}_${projectId}`), {
    uid,
    projectId,
    savedAt: new Date().toISOString(),
  });
}

export async function upsertMatch(uid, projectId, score, breakdown) {
  await setDoc(doc(db, COLLECTIONS.MATCHES, `${uid}_${projectId}`), {
    uid,
    projectId,
    score,
    breakdown,
    computedAt: new Date().toISOString(),
  });
}

export async function logContribution(uid, contribution) {
  await setDoc(doc(collection(db, COLLECTIONS.CONTRIBUTIONS)), {
    ...contribution,
    uid,
    loggedAt: new Date().toISOString(),
  });
}

export async function fetchProjects(filters = {}) {
  const constraints = [];

  if (filters.language) {
    constraints.push(where("languages", "array-contains", filters.language));
  }
  if (filters.difficulty) {
    constraints.push(where("difficulty", "==", filters.difficulty));
  }

  constraints.push(orderBy("stars", "desc"));
  constraints.push(limit(filters.limit ?? 50));

  const snap = await getDocs(query(collection(db, COLLECTIONS.PROJECTS), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchRecentContributions(uid, count = 10) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.CONTRIBUTIONS),
      where("uid", "==", uid),
      orderBy("loggedAt", "desc"),
      limit(count)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------------------------
// Like / Pass actions ("swipe" history that adapts future matching)
// ---------------------------------------------------------------------------

export async function saveProjectAction(uid, projectId, action) {
  const ref = doc(db, COLLECTIONS.SAVED_PROJECTS, `${uid}_${projectId}`);
  const existing = await getDoc(ref);
  const base = {
    uid,
    projectId,
    action,
    updatedAt: new Date().toISOString(),
  };
  if (existing.exists()) {
    await updateDoc(ref, { action, updatedAt: base.updatedAt });
  } else {
    await setDoc(ref, { ...base, savedAt: base.updatedAt });
  }
}

export async function fetchSavedActions(uid) {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.SAVED_PROJECTS), where("uid", "==", uid))
  );
  return snap.docs.map((d) => d.data());
}

export async function fetchSavedProjectIds(uid) {
  const actions = await fetchSavedActions(uid);
  return actions.reduce((acc, a) => {
    acc[a.projectId] = a.action;
    return acc;
  }, {});
}

export async function fetchProjectRequesters() {
  const snap = await getDocs(collection(db, COLLECTIONS.SAVED_PROJECTS));
  return snap.docs.map((d) => d.data());
}

// ---------------------------------------------------------------------------
// Contributions sync (mapped from GitHub events)
// ---------------------------------------------------------------------------

export async function syncContributions(uid, events) {
  const existing = await getDocs(
    query(collection(db, COLLECTIONS.CONTRIBUTIONS), where("uid", "==", uid), limit(500))
  );
  const seen = new Set(existing.docs.map((d) => d.data().eventId).filter(Boolean));

  const mapped = events
    .map((e) => {
      const repo = e.repo?.name || "";
      const base = { repo, eventId: e.id, at: e.created_at };
      switch (e.type) {
        case "PushEvent":
          return { ...base, type: "opened", title: `Push to ${repo}` };
        case "PullRequestEvent":
          return {
            ...base,
            type: e.payload?.action === "closed" && e.payload?.pull_request?.merged ? "merge" : "opened",
            title: e.payload?.pull_request?.title || `PR in ${repo}`,
          };
        case "IssueCommentEvent":
          return { ...base, type: "review", title: `Commented in ${repo}` };
        case "IssuesEvent":
          return { ...base, type: e.payload?.action === "opened" ? "opened" : "review", title: e.payload?.issue?.title || `Issue in ${repo}` };
        default:
          return null;
      }
    })
    .filter(Boolean)
    .filter((c) => !seen.has(c.eventId));

  const written = [];
  for (const c of mapped.slice(0, 60)) {
    await logContribution(uid, c);
    written.push(c);
  }
  return written.length;
}

// ---------------------------------------------------------------------------
// Maintainer dashboard
// ---------------------------------------------------------------------------

export async function fetchMaintainedProjects(uid) {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.PROJECTS), where("maintainerUid", "==", uid))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchAllMaintainedProjects() {
  const snap = await getDocs(query(collection(db, COLLECTIONS.PROJECTS), where("maintainerUid", "!=", "")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function publishProject(uid, data) {
  const id = data.fullName || `${data.owner}/${data.name}`;
  await setDoc(doc(db, COLLECTIONS.PROJECTS, id), {
    ...data,
    id,
    maintainerUid: uid,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function createProjectRequest(uid, project, score) {
  const id = `${uid}_${project.id || project.fullName}`;
  await setDoc(doc(db, COLLECTIONS.PROJECT_REQUESTS, id), {
    uid,
    projectId: project.id || project.fullName,
    projectOwner: project.owner,
    projectName: project.name,
    maintainerUid: project.maintainerUid,
    score,
    status: "pending",
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return id;
}

export async function fetchProjectRequestsFor(uid) {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.PROJECT_REQUESTS), where("maintainerUid", "==", uid))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateProjectRequest(uid, requestId, status) {
  await updateDoc(doc(db, COLLECTIONS.PROJECT_REQUESTS, requestId), {
    status,
    reviewedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function createTeam(uid, { name, projectId, projectName, description }) {
  const ref = doc(collection(db, COLLECTIONS.TEAMS));
  const team = {
    name,
    projectId,
    projectName,
    description: description || "",
    ownerUid: uid,
    memberUids: [uid],
    members: { [uid]: { role: "owner", joinedAt: new Date().toISOString() } },
    issues: [],
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, team);
  return { id: ref.id, ...team };
}

export async function fetchUserTeams(uid) {
  const snap = await getDocs(query(collection(db, COLLECTIONS.TEAMS), where("memberUids", "array-contains", uid)));
  let teams = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (teams.length === 0) {
    const all = await getDocs(collection(db, COLLECTIONS.TEAMS));
    teams = all.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((t) => t.ownerUid === uid || (t.members && t.members[uid]));
  }
  return teams;
}

export async function fetchTeam(teamId) {
  return (await getDoc(doc(db, COLLECTIONS.TEAMS, teamId))).data();
}

export async function addTeamMember(teamId, uid) {
  const ref = doc(db, COLLECTIONS.TEAMS, teamId);
  const team = (await getDoc(ref)).data() || {};
  const members = team.members || {};
  if (members[uid]) return;
  members[uid] = { role: "member", joinedAt: new Date().toISOString() };
  await updateDoc(ref, { members, memberUids: Object.keys(members) });
}

export async function assignTeamIssue(teamId, { title, assignedTo, url }) {
  const ref = doc(db, COLLECTIONS.TEAMS, teamId);
  const team = (await getDoc(ref)).data() || {};
  const issues = [
    ...(team.issues || []),
    {
      id: `${Date.now()}`,
      title,
      assignedTo,
      url: url || "",
      status: "open",
      addedAt: new Date().toISOString(),
    },
  ];
  await updateDoc(ref, { issues });
}

export async function updateTeamIssue(teamId, issueId, status) {
  const ref = doc(db, COLLECTIONS.TEAMS, teamId);
  const team = (await getDoc(ref)).data() || {};
  const issues = (team.issues || []).map((i) => (i.id === issueId ? { ...i, status } : i));
  await updateDoc(ref, { issues });
}

// ---------------------------------------------------------------------------
// Bounties
// ---------------------------------------------------------------------------

export async function fetchBounties() {
  const snap = await getDocs(query(collection(db, COLLECTIONS.BOUNTIES), orderBy("amount", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createBounty(uid, data) {
  const ref = doc(collection(db, COLLECTIONS.BOUNTIES));
  await setDoc(ref, {
    ...data,
    createdBy: uid,
    status: "open",
    claimedBy: null,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function claimBounty(bountyId, uid) {
  await updateDoc(doc(db, COLLECTIONS.BOUNTIES, bountyId), {
    claimedBy: uid,
    status: "claimed",
    claimedAt: new Date().toISOString(),
  });
}

export async function unclaimBounty(bountyId) {
  await updateDoc(doc(db, COLLECTIONS.BOUNTIES, bountyId), {
    claimedBy: null,
    status: "open",
    claimedAt: null,
  });
}

// ---------------------------------------------------------------------------
// Mentorship + threads
// ---------------------------------------------------------------------------

export async function fetchMentors() {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.USERS), where("mentor.available", "==", true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function requestMentorship(uid, mentorUid, project, message) {
  const ref = doc(collection(db, COLLECTIONS.THREADS));
  const thread = {
    kind: "mentorship",
    mentorUid,
    participantUids: [uid, mentorUid],
    project: project || null,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, thread);

  await setDoc(doc(collection(db, COLLECTIONS.MENTORSHIPS)), {
    menteeUid: uid,
    mentorUid,
    threadId: ref.id,
    project: project || null,
    message: message || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  await sendMessage(ref.id, uid, message || "Hi! I'd like your mentorship.");
  return ref.id;
}

export async function fetchMyMentorships(uid) {
  const asMentee = await getDocs(
    query(collection(db, COLLECTIONS.MENTORSHIPS), where("menteeUid", "==", uid))
  );
  const asMentor = await getDocs(
    query(collection(db, COLLECTIONS.MENTORSHIPS), where("mentorUid", "==", uid))
  );
  return [...asMentee.docs, ...asMentor.docs].map((d) => ({ id: d.id, ...d.data() }));
}

export async function sendMessage(threadId, uid, text) {
  await setDoc(doc(collection(db, COLLECTIONS.MESSAGES)), {
    threadId,
    uid,
    text,
    at: new Date().toISOString(),
  });
}

export async function fetchThreadMessages(threadId) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MESSAGES),
      where("threadId", "==", threadId),
      orderBy("at", "asc"),
      limit(100)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}