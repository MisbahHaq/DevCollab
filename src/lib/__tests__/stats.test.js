import { describe, it, expect } from "vitest";
import { BASE_STATS, deriveStats } from "../stats.js";

describe("deriveStats", () => {
  it("returns zeroed stats for no contributions", () => {
    expect(deriveStats([])).toEqual(BASE_STATS);
  });
  it("counts merged PRs", () => {
    const stats = deriveStats([{ type: "merge" }, { type: "merge" }]);
    expect(stats.totalMerged).toBe(2);
  });
  it("counts reviews and docs separately", () => {
    const stats = deriveStats([{ type: "review" }, { type: "docs" }]);
    expect(stats.reviews).toBe(1);
    expect(stats.docsMerged).toBe(1);
  });
  it("falls unknown types into opened", () => {
    const stats = deriveStats([{ type: "opened" }, { type: "push" }]);
    expect(stats.totalOpened).toBe(2);
  });
  it("preserves a base value (e.g. streak already persisted)", () => {
    const stats = deriveStats([{ type: "merge" }], { streak: 12 });
    expect(stats.totalMerged).toBe(1);
    expect(stats.streak).toBe(12);
  });
  it("does not mutate the caller's base object", () => {
    const base = { streak: 5 };
    deriveStats([{ type: "merge" }], base);
    expect(base.streak).toBe(5);
    expect(base.totalMerged).toBeUndefined();
  });
});