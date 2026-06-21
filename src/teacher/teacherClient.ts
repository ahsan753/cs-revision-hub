import { requireSupabase } from "../lib/supabaseClient";

export interface TeacherClass {
  id: string;
  name: string;
  year_group: string;
  join_code: string;
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

export interface CreatedStudentAccount {
  student_id: string;
  full_name: string;
  class_id: string;
  class_name: string;
  username: string;
  password: string;
}

export async function createClass(name: string, yearGroup: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc("create_class", {
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
    .select("id, name, year_group, join_code")
    .order("created_at", { ascending: false })
    .returns<TeacherClass[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getClassRoster() {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc("get_teacher_student_accounts");
  if (error) throw error;
  return (data ?? []) as RosterRow[];
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

export async function updateManagedStudentAccount({
  studentId,
  username,
  password,
}: {
  studentId: string;
  username?: string;
  password?: string;
}) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("teacher-student-accounts", {
    body: {
      action: "update",
      student_id: studentId,
      username,
      password,
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
