import { describe, expect, it } from "vitest";
import {
  normaliseLoginIdentifier,
  studentLoginId,
  usernameFromEmail,
} from "./studentCredentials";

describe("studentCredentials", () => {
  it("turns a student username into the internal auth email", () => {
    expect(normaliseLoginIdentifier("  Ada.Lovelace  ")).toBe(
      "ada.lovelace@csrevisionhub.local",
    );
  });

  it("turns a themed login id into the internal auth email", () => {
    expect(normaliseLoginIdentifier("ada.lovelace@csrevisionhub")).toBe(
      "ada.lovelace@csrevisionhub.local",
    );
  });

  it("keeps full email logins intact", () => {
    expect(normaliseLoginIdentifier("teacher@example.com")).toBe(
      "teacher@example.com",
    );
  });

  it("extracts the student username from the internal auth email", () => {
    expect(usernameFromEmail("ada.lovelace@csrevisionhub.local")).toBe(
      "ada.lovelace",
    );
  });

  it("formats the student-facing login id", () => {
    expect(studentLoginId("Ada.Lovelace")).toBe("ada.lovelace@csrevisionhub");
  });
});
