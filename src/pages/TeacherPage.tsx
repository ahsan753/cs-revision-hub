import { FormEvent, useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  createClass,
  getClassRoster,
  getTeacherClasses,
  removeStudentFromClass,
  setStudentDisplayName,
  type RosterRow,
  type TeacherClass,
} from "../teacher/teacherClient";

export function TeacherPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("Year 10");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [classRows, rosterRows] = await Promise.all([
        getTeacherClasses(),
        getClassRoster(),
      ]);
      setClasses(classRows);
      setRoster(rosterRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load teacher data.");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await createClass(name, yearGroup);
      setName("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create class.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Teacher</h1>
        <p className="mt-2 text-sm font-bold text-muted">
          Create classes, share join codes, and approve public display names.
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Create class</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={submit}>
          <input
            className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Year 10 CS Set 1"
          />
          <input
            className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={yearGroup}
            onChange={(event) => setYearGroup(event.target.value)}
          />
          <Button disabled={busy || !name.trim() || !yearGroup.trim()}>
            Create
          </Button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {classes.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-line bg-white p-5 shadow-soft"
          >
            <p className="text-sm font-bold text-muted">{item.year_group}</p>
            <h2 className="mt-1 text-xl font-extrabold">{item.name}</h2>
            <p className="mt-3 inline-flex rounded-lg bg-indigo-50 px-3 py-2 font-mono text-lg font-extrabold text-primary">
              {item.join_code}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Roster</h2>
          <Button variant="secondary" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {roster.length ? (
            roster.map((student) => (
              <RosterItem
                key={student.student_id}
                student={student}
                onRefresh={refresh}
                onMessage={setMessage}
              />
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-muted">
              No students have joined yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function RosterItem({
  student,
  onRefresh,
  onMessage,
}: {
  student: RosterRow;
  onRefresh: () => Promise<void>;
  onMessage: (message: string | null) => void;
}) {
  const [displayName, setDisplayName] = useState(student.display_name ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    onMessage(null);
    try {
      await setStudentDisplayName(
        student.student_id,
        displayName.trim() || null,
      );
      await onRefresh();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Could not update name.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
      <div>
        <p className="text-sm font-extrabold">{student.full_name}</p>
        <p className="text-xs font-bold text-muted">{student.xp} ranked XP</p>
      </div>
      <input
        className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Public display name"
      />
      <Button variant="secondary" disabled={busy} onClick={() => void save()}>
        Save
      </Button>
      <Button
        variant="danger"
        disabled={busy}
        onClick={() => {
          if (window.confirm("Remove this student from the class?")) {
            setBusy(true);
            removeStudentFromClass(student.student_id)
              .then(onRefresh)
              .catch((error) =>
                onMessage(
                  error instanceof Error ? error.message : "Could not remove student.",
                ),
              )
              .finally(() => setBusy(false));
          }
        }}
      >
        Remove
      </Button>
    </div>
  );
}
