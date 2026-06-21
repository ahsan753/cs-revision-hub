import {
  teacherManagedAuthEmailDomain,
  teacherManagedLoginSuffix,
} from "./nameFromEmail";

export function normaliseLoginIdentifier(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (!value) return value;
  if (value.endsWith(`@${teacherManagedLoginSuffix}`)) {
    return `${value.slice(0, -teacherManagedLoginSuffix.length)}${teacherManagedAuthEmailDomain}`;
  }
  if (value.includes("@")) return value;
  return `${value}@${teacherManagedAuthEmailDomain}`;
}

export function usernameFromEmail(email: string) {
  return email.trim().toLowerCase().replace(`@${teacherManagedAuthEmailDomain}`, "");
}

export function studentLoginId(username: string) {
  return `${username.trim().toLowerCase()}@${teacherManagedLoginSuffix}`;
}
