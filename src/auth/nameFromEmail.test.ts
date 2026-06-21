import { describe, expect, it } from "vitest";
import { isAllowedStudentEmail, nameFromEmail } from "./nameFromEmail";

describe("nameFromEmail", () => {
  it("derives a private displayable name from school email local parts", () => {
    expect(nameFromEmail("ali.khan+test@student.orbital.education")).toBe(
      "Ali Khan",
    );
    expect(nameFromEmail("sara_ahmed-10@student.orbital.education")).toBe(
      "Sara Ahmed 10",
    );
  });

  it("checks the student email domain", () => {
    expect(isAllowedStudentEmail("a@student.orbital.education")).toBe(true);
    expect(isAllowedStudentEmail("a@example.com")).toBe(false);
  });
});
