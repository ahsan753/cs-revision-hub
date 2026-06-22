import { requireSupabase } from "../lib/supabaseClient";

export interface TeacherClass {
  id: string;
  name: string;
  year_group: string;
}

export interface TeacherClassSummary extends TeacherClass {
  student_count: number;
  average_xp: number;
  total_xp: number;
  active_this_week: number;
  latest_activity_at: string | null;
}

export interface RosterRow {
  student_id: string;
  username: string | null;
  display_name: string | null;
  full_name: string;
  class_id: string;
  class_name: string;
  xp: number;
}

export interface TeacherClassRosterRow extends RosterRow {
  level: number;
  streak: number;
  best_streak: number;
  total_answered: number;
  last_answer_at: string | null;
}

export interface TeacherClassActivityRow {
  event_id: string;
  student_id: string;
  student_name: string;
  item_id: string;
  activity: string;
  content_kind: string;
  correct: boolean;
  xp_awarded: number;
  created_at: string;
}

export interface TeacherClassWeakAreaRow {
  item_id: string;
  attempts: number;
  correct_attempts: number;
  miss_count: number;
  affected_students: number;
  last_attempt_at: string | null;
}

export interface CreatedStudentAccount {
  student_id: string;
  full_name: string;
  class_id: string;
  class_name: string;
  username: string;
  password: string;
  display_name: string;
}

export interface StudentAccountImportError {
  index: number;
  first_name: string;
  last_name: string;
  class_name?: string;
  error: string;
}

export interface BulkCreatedStudentAccounts {
  created: CreatedStudentAccount[];
  errors: StudentAccountImportError[];
}

export async function createClass(name: string, yearGroup: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_class", {
    p_name: name,
    p_year_group: yearGroup,
  });
  if (error) throw error;
  return ((data ?? []) as TeacherClass[])[0] ?? null;
}

export async function getTeacherClasses() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("classes")
    .select("id, name, year_group")
    .order("created_at", { ascending: false })
    .returns<TeacherClass[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getTeacherClassSummaries() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_teacher_class_summaries");
  if (error) throw error;
  return (data ?? []) as TeacherClassSummary[];
}

export async function getClassRoster() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_teacher_student_accounts");
  if (error) throw error;
  return (data ?? []) as RosterRow[];
}

export async function getTeacherClassRoster(classId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_teacher_class_roster", {
    p_class_id: classId,
  });
  if (error) throw error;
  return (data ?? []) as TeacherClassRosterRow[];
}

export async function getTeacherClassActivity(classId: string, limit = 20) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_teacher_class_activity", {
    p_class_id: classId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as TeacherClassActivityRow[];
}

export async function getTeacherClassWeakAreas(classId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_teacher_class_weak_areas", {
    p_class_id: classId,
  });
  if (error) throw error;
  return (data ?? []) as TeacherClassWeakAreaRow[];
}

export async function createManagedStudentAccount({
  firstName,
  lastName,
  classId,
}: {
  firstName: string;
  lastName: string;
  classId: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke<CreatedStudentAccount>(
    "teacher-student-accounts",
    {
      body: {
        action: "create",
        first_name: firstName,
        last_name: lastName,
        class_id: classId,
      },
    },
  );
  if (error) throw error;
  if (!data) throw new Error("Could not create student account.");
  return data;
}

export async function bulkCreateManagedStudentAccounts({
  students,
  classId,
}: {
  students: Array<{ firstName: string; lastName: string; className?: string }>;
  classId?: string;
}) {
  const client = requireSupabase();
  const { data, error } =
    await client.functions.invoke<BulkCreatedStudentAccounts>(
      "teacher-student-accounts",
      {
        body: {
          action: "bulk_create",
          class_id: classId,
          students: students.map((student) => ({
            first_name: student.firstName,
            last_name: student.lastName,
            class_name: student.className,
          })),
        },
      },
    );
  if (error) throw error;
  if (!data) throw new Error("Could not import student accounts.");
  return data;
}

export async function updateManagedStudentAccount({
  studentId,
  fullName,
  displayName,
  classId,
  username,
  password,
}: {
  studentId: string;
  fullName?: string;
  displayName?: string | null;
  classId?: string;
  username?: string;
  password?: string;
}) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("teacher-student-accounts", {
    body: {
      action: "update",
      student_id: studentId,
      full_name: fullName,
      display_name: displayName,
      class_id: classId,
      username,
      password,
    },
  });
  if (error) throw error;
}

export async function deleteManagedStudentAccount(studentId: string) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("teacher-student-accounts", {
    body: {
      action: "delete",
      student_id: studentId,
    },
  });
  if (error) throw error;
}

export async function deleteManagedClass(classId: string) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("teacher-student-accounts", {
    body: {
      action: "delete_class",
      class_id: classId,
    },
  });
  if (error) throw error;
}

export async function setStudentDisplayName(
  studentId: string,
  displayName: string | null,
) {
  const client = requireSupabase();
  const { error } = await client.rpc("set_student_display_name", {
    p_student_id: studentId,
    p_display_name: displayName,
  });
  if (error) throw error;
}

export async function removeStudentFromClass(studentId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("remove_student_from_class", {
    p_student_id: studentId,
  });
  if (error) throw error;
}
