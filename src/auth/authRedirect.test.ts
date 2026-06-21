import { describe, expect, it } from "vitest";
import { buildAuthRedirectTo } from "./authRedirect";

describe("buildAuthRedirectTo", () => {
  it("uses the app root for local development", () => {
    expect(buildAuthRedirectTo("http://127.0.0.1:5173", "/")).toBe(
      "http://127.0.0.1:5173/",
    );
  });

  it("keeps the GitHub Pages base path", () => {
    expect(
      buildAuthRedirectTo("https://ashah.github.io", "/cs-revision-hub/"),
    ).toBe("https://ashah.github.io/cs-revision-hub/");
  });
});
