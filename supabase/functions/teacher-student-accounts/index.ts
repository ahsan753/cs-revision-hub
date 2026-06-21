import { adminClient, userClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const studentAuthDomain = "csrevisionhub.local";

type AccountRequest =
  | {
      action: "create";
      first_name?: string;
      last_name?: string;
      class_id?: string;
    }
  | {
      action: "update";
      student_id?: string;
      full_name?: string;
      display_name?: string | null;
      class_id?: string;
      username?: string;
      password?: string;
    }
  | {
      action: "delete";
      student_id?: string;
    };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, { status: 405 });
  }

  try {
    const token = getBearerToken(req);
    const authClient = userClient(token);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse(req, { error: "Unauthorised" }, { status: 401 });
    }

    const admin = adminClient();
    await requireTeacher(admin, user.id);

    const body = (await req.json().catch(() => null)) as AccountRequest | null;
    if (!body || !("action" in body)) {
      return jsonResponse(req, { error: "Invalid request" }, { status: 400 });
    }

    if (body.action === "create") {
      return jsonResponse(
        req,
        await createStudentAccount(admin, user.id, body),
      );
    }

    if (body.action === "update") {
      return jsonResponse(
        req,
        await updateStudentAccount(admin, user.id, body),
      );
    }

    if (body.action === "delete") {
      return jsonResponse(
        req,
        await deleteStudentAccount(admin, user.id, body),
      );
    }

    return jsonResponse(req, { error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return jsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
});

async function createStudentAccount(
  admin: ReturnType<typeof adminClient>,
  teacherId: string,
  body: Extract<AccountRequest, { action: "create" }>,
) {
  const firstName = cleanName(body.first_name);
  const lastName = cleanName(body.last_name);
  const classId = cleanUuid(body.class_id);

  if (!firstName || !lastName)
    throw new Error("First and last name are required.");
  if (!classId) throw new Error("Choose a class for this student.");

  const studentClass = await getTeacherClass(admin, teacherId, classId);
  const fullName = `${firstName} ${lastName}`;
  const username = await nextAvailableUsername(
    admin,
    `${slugName(firstName)}.${slugName(lastName)}`,
  );
  const displayName = await nextAvailableDisplayName(
    admin,
    studentClass.id,
    firstName,
    lastName,
  );
  const password = generatePassword();
  const email = `${username}@${studentAuthDomain}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create student account.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      class_id: studentClass.id,
      year_group: studentClass.year_group,
      role: "student",
      login_username: username,
      display_name: displayName,
    })
    .eq("id", data.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }

  return {
    student_id: data.user.id,
    full_name: fullName,
    class_id: studentClass.id,
    class_name: studentClass.name,
    username,
    password,
    display_name: displayName,
  };
}

async function updateStudentAccount(
  admin: ReturnType<typeof adminClient>,
  teacherId: string,
  body: Extract<AccountRequest, { action: "update" }>,
) {
  const studentId = cleanUuid(body.student_id);
  if (!studentId) throw new Error("Student account is required.");

  await requireTeacherOwnsStudent(admin, teacherId, studentId);

  const updates: {
    email?: string;
    password?: string;
    email_confirm?: boolean;
  } = {};
  const profileUpdates: {
    full_name?: string;
    display_name?: string | null;
    class_id?: string;
    year_group?: string;
    login_username?: string;
  } = {};

  if (typeof body.full_name === "string") {
    const fullName = cleanName(body.full_name);
    if (!fullName) throw new Error("Student name is required.");
    profileUpdates.full_name = fullName;
  }

  if (Object.prototype.hasOwnProperty.call(body, "display_name")) {
    profileUpdates.display_name =
      typeof body.display_name === "string" && body.display_name.trim()
        ? cleanName(body.display_name)
        : null;
  }

  if (typeof body.class_id === "string" && body.class_id.trim()) {
    const studentClass = await getTeacherClass(admin, teacherId, body.class_id);
    profileUpdates.class_id = studentClass.id;
    profileUpdates.year_group = studentClass.year_group;
  }

  if (typeof body.username === "string" && body.username.trim()) {
    const username = sanitiseUsername(body.username);
    await assertUsernameAvailable(admin, username, studentId);
    updates.email = `${username}@${studentAuthDomain}`;
    updates.email_confirm = true;
    profileUpdates.login_username = username;
  }

  if (typeof body.password === "string" && body.password.trim()) {
    if (body.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    updates.password = body.password;
  }

  if (
    !updates.email &&
    !updates.password &&
    Object.keys(profileUpdates).length === 0
  ) {
    throw new Error("Enter student details, a new username, or a password.");
  }

  if (updates.email || updates.password) {
    const { error } = await admin.auth.admin.updateUserById(studentId, updates);
    if (error) throw error;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await admin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", studentId);
    if (profileError) throw profileError;
  }

  return { ok: true, username: profileUpdates.login_username ?? null };
}

async function deleteStudentAccount(
  admin: ReturnType<typeof adminClient>,
  teacherId: string,
  body: Extract<AccountRequest, { action: "delete" }>,
) {
  const studentId = cleanUuid(body.student_id);
  if (!studentId) throw new Error("Student account is required.");

  await requireTeacherOwnsStudent(admin, teacherId, studentId);

  const { error } = await admin.auth.admin.deleteUser(studentId);
  if (error) throw error;

  return { ok: true };
}

async function requireTeacher(
  admin: ReturnType<typeof adminClient>,
  teacherId: string,
) {
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", teacherId)
    .maybeSingle<{ role: string }>();
  if (error) throw error;
  if (data?.role !== "teacher") throw new Error("Teacher role required.");
}

async function getTeacherClass(
  admin: ReturnType<typeof adminClient>,
  teacherId: string,
  classId: string,
) {
  const { data, error } = await admin
    .from("classes")
    .select("id, name, year_group")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle<{ id: string; name: string; year_group: string }>();
  if (error) throw error;
  if (!data) throw new Error("Class not found.");
  return data;
}

async function requireTeacherOwnsStudent(
  admin: ReturnType<typeof adminClient>,
  teacherId: string,
  studentId: string,
) {
  const { data, error } = await admin
    .from("profiles")
    .select("class_id, classes!profiles_class_id_fkey(teacher_id)")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle<{
      class_id: string | null;
      classes: { teacher_id: string } | null;
    }>();
  if (error) throw error;
  if (!data?.class_id || data.classes?.teacher_id !== teacherId) {
    throw new Error("Student is not in one of your classes.");
  }
}

async function nextAvailableUsername(
  admin: ReturnType<typeof adminClient>,
  baseUsername: string,
) {
  const base = sanitiseUsername(baseUsername);
  for (let index = 0; index < 100; index += 1) {
    const username = index === 0 ? base : `${base}${index + 1}`;
    const available = await isUsernameAvailable(admin, username);
    if (available) return username;
  }
  return `${base}${crypto.randomUUID().slice(0, 8)}`;
}

async function nextAvailableDisplayName(
  admin: ReturnType<typeof adminClient>,
  classId: string,
  firstName: string,
  lastName: string,
) {
  const base = cleanName(firstName);
  const lastInitial = cleanName(lastName).charAt(0).toUpperCase();
  const candidates = lastInitial ? [base, `${base} ${lastInitial}`] : [base];

  for (const candidate of candidates) {
    if (await isDisplayNameAvailable(admin, classId, candidate)) {
      return candidate;
    }
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base} ${index}`;
    if (await isDisplayNameAvailable(admin, classId, candidate)) {
      return candidate;
    }
  }

  return `${base} ${crypto.randomUUID().slice(0, 4)}`;
}

async function assertUsernameAvailable(
  admin: ReturnType<typeof adminClient>,
  username: string,
  studentId: string,
) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("login_username", username)
    .neq("id", studentId)
    .limit(1);
  if (error) throw error;
  if ((data ?? []).length > 0) throw new Error("Username is already in use.");
}

async function isUsernameAvailable(
  admin: ReturnType<typeof adminClient>,
  username: string,
) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("login_username", username)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length === 0;
}

async function isDisplayNameAvailable(
  admin: ReturnType<typeof adminClient>,
  classId: string,
  displayName: string,
) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("class_id", classId)
    .ilike("display_name", displayName)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length === 0;
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanUuid(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function slugName(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return slug || "student";
}

function sanitiseUsername(value: string) {
  const username = value
    .trim()
    .toLowerCase()
    .replace(`@${studentAuthDomain}`, "")
    .replace("@csrevisionhub", "")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");
  if (username.length < 3)
    throw new Error("Username must be at least 3 characters.");
  if (username.length > 48)
    throw new Error("Username must be 48 characters or fewer.");
  return username;
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("Missing bearer token");
  return match[1];
}
