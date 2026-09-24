// Shared text search helpers. GitHub search is token-AND across name,
// description, readme and topics; we mirror that locally with the same
// tokenizer so navbar, discovery and project detail stay consistent.

export function projectHaystack(project) {
  return [
    project.owner,
    project.name,
    project.fullName,
    project.id,
    project.description,
    ...(project.languages || []),
    ...(project.frameworks || []),
    ...(project.topics || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function queryTokens(query) {
  return String(query || "")
    .trim()
    .toLowerCase()
    .replaceAll("/", " ")
    .split(/\s+/)
    .filter(Boolean);
}

// True when every token in `query` appears somewhere in the project's haystack.
// Empty/blank queries match everything.
export function projectMatchesQuery(project, query) {
  const tokens = queryTokens(query);
  if (!tokens.length) return true;
  const hay = projectHaystack(project);
  return tokens.every((t) => hay.includes(t));
}