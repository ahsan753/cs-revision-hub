export const studentEmailDomain = "student.orbital.education";

export function isAllowedStudentEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${studentEmailDomain}`);
}

export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const withoutPlusTag = local.split("+")[0] ?? local;
  const words = withoutPlusTag
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
