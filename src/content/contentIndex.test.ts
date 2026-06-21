import { describe, expect, it } from "vitest";
import { getScopeBackPath } from "./contentIndex";

describe("getScopeBackPath", () => {
  it("returns the owning subtopic overview for subtopic practice", () => {
    expect(getScopeBackPath({ kind: "subtopic", subtopicId: "2.3" })).toBe(
      "/unit/u2/2.3",
    );
  });

  it("returns the unit overview for unit practice", () => {
    expect(getScopeBackPath({ kind: "unit", unitId: "u2" })).toBe("/unit/u2");
  });

  it("returns the dashboard for mixed or unknown practice", () => {
    expect(getScopeBackPath({ kind: "mixed" })).toBe("/");
    expect(getScopeBackPath({ kind: "subtopic", subtopicId: "missing" })).toBe(
      "/",
    );
  });
});
