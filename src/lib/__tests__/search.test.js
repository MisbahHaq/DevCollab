import { describe, it, expect } from "vitest";
import { projectMatchesQuery, queryTokens, projectHaystack } from "../search.js";

const reactRepo = {
  id: "vercel/next.js",
  owner: "vercel",
  name: "next.js",
  fullName: "vercel/next.js",
  description: "The React framework for production",
  languages: ["JavaScript", "TypeScript"],
  frameworks: ["React"],
  topics: ["nextjs", "react"],
};

describe("queryTokens", () => {
  it("normalizes slashes so owner/name matches split into tokens", () => {
    expect(queryTokens("vercel/next.js")).toEqual(["vercel", "next.js"]);
  });
  it("lowercases and drops empty tokens", () => {
    expect(queryTokens("  Next   React  ")).toEqual(["next", "react"]);
  });
  it("returns an empty array for blank input", () => {
    expect(queryTokens("   ")).toEqual([]);
  });
});

describe("projectHaystack", () => {
  it("joins identifying fields, languages, frameworks and topics", () => {
    const hay = projectHaystack(reactRepo);
    expect(hay).toContain("vercel");
    expect(hay).toContain("react");
    expect(hay).toContain("nextjs");
  });
});

describe("projectMatchesQuery", () => {
  it("matches on repo name", () => {
    expect(projectMatchesQuery(reactRepo, "next.js")).toBe(true);
  });
  it("matches on owner", () => {
    expect(projectMatchesQuery(reactRepo, "vercel")).toBe(true);
  });
  it("matches multi-token queries across fields (token-AND)", () => {
    expect(projectMatchesQuery(reactRepo, "vercel nextjs")).toBe(true);
  });
  it("matches on topics", () => {
    expect(projectMatchesQuery(reactRepo, "nextjs")).toBe(true);
  });
  it("requires all tokens (AND semantics)", () => {
    expect(projectMatchesQuery(reactRepo, "vercel python")).toBe(false);
  });
  it("matches an empty query (everything)", () => {
    expect(projectMatchesQuery(reactRepo, "")).toBe(true);
  });
});