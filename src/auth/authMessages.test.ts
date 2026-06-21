import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authMessages";

describe("authErrorMessage", () => {
  it("keeps useful error messages", () => {
    expect(
      authErrorMessage(
        new Error("Use your @student.orbital.education email address."),
        "Signup failed.",
      ),
    ).toBe("Use your @student.orbital.education email address.");
  });

  it("replaces object-like messages with the fallback", () => {
    expect(authErrorMessage(new Error("{}"), "Signup failed.")).toBe(
      "Signup failed.",
    );
    expect(authErrorMessage({ message: {} }, "Signup failed.")).toBe(
      "Signup failed.",
    );
  });

  it("replaces empty messages with the fallback", () => {
    expect(authErrorMessage("", "Sign in failed.")).toBe("Sign in failed.");
  });

  it("explains Supabase email rate limits in student-friendly language", () => {
    expect(authErrorMessage(new Error("email rate limit exceeded"), "Signup failed.")).toBe(
      "Too many verification emails have been sent recently. Please wait a little while before trying again.",
    );
  });
});
