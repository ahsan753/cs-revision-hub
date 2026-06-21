import { requireSupabase } from "../lib/supabaseClient";

export interface TeacherClass {
  id: string;
  name: string;
  year_group: string;
  join_code: string;
}

export interface RosterRow {
  student_id: string;
  display_name: string | null;
  full_name: string;
  xp: number;
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
    .rpc("get_class_roster");
  if (error) throw error;
  return (data ?? []) as RosterRow[];
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
