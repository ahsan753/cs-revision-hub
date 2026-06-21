import { FormEvent, useEffect, useState } from "react";
import { Clipboard, KeyRound, RefreshCcw, Trash2, UserPlus } from "lucide-react";
import { studentLoginId } from "../auth/studentCredentials";
import { Button } from "../components/ui/Button";
import {
  createClass,
  createManagedStudentAccount,
  deleteManagedStudentAccount,
  getClassRoster,
  getTeacherClasses,
  setStudentDisplayName,
  updateManagedStudentAccount,
  type CreatedStudentAccount,
  type RosterRow,
  type TeacherClass,
} from "../teacher/teacherClient";

export function TeacherPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("Year 10");
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [latestAccount, setLatestAccount] =
    useState<CreatedStudentAccount | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [studentBusy, setStudentBusy] = useState(false);

  const refresh = async () => {
    try {
      const [classRows, rosterRows] = await Promise.all([
        getTeacherClasses(),
        getClassRoster(),
      ]);
      setClasses(classRows);
      setRoster(rosterRows);
      setStudentClassId((current) => current || classRows[0]?.id || "");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load teacher data.",
      );
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
      setMessage(
        error instanceof Error ? error.message : "Could not create class.",
      );
    } finally {
      setBusy(false);
    }
  };

  const createStudent = async (event: FormEvent) => {
    event.preventDefault();
    setStudentBusy(true);
    setMessage(null);
    setLatestAccount(null);
    try {
      const account = await createManagedStudentAccount({
        firstName: studentFirstName,
        lastName: studentLastName,
        classId: studentClassId,
      });
      setLatestAccount(account);
      setStudentFirstName("");
      setStudentLastName("");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create student login.",
      );
    } finally {
      setStudentBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Teacher</h1>
        <p className="mt-2 text-sm font-bold text-muted">
          Create classes, generate student logins, and manage roster access.
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Create class</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]"
          onSubmit={submit}
        >
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

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <UserPlus aria-hidden="true" className="size-5 text-primary" />
          <h2 className="text-lg font-extrabold">Create student login</h2>
        </div>
        <form
          className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]"
          onSubmit={createStudent}
        >
          <input
            className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={studentFirstName}
            onChange={(event) => setStudentFirstName(event.target.value)}
            placeholder="First name"
            autoComplete="off"
          />
          <input
            className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={studentLastName}
            onChange={(event) => setStudentLastName(event.target.value)}
            placeholder="Last name"
            autoComplete="off"
          />
          <select
            className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-bold outline-none focus:border-primary"
            value={studentClassId}
            onChange={(event) => setStudentClassId(event.target.value)}
          >
            <option value="">Choose class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button
            disabled={
              studentBusy ||
              !studentFirstName.trim() ||
              !studentLastName.trim() ||
              !studentClassId
            }
          >
            {studentBusy ? "Creating..." : "Generate"}
          </Button>
        </form>
        {latestAccount ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-extrabold text-emerald-800">
              Login created for {latestAccount.full_name}
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-700">
              Display name set to {latestAccount.display_name}
            </p>
            <div className="mt-3 grid gap-2 text-sm font-bold md:grid-cols-[1fr_1fr_auto] md:items-center">
              <p className="font-mono text-emerald-900">
                {studentLoginId(latestAccount.username)}
              </p>
              <p className="font-mono text-emerald-900">
                {latestAccount.password}
              </p>
              <Button
                variant="success"
                onClick={() =>
                  void copyStudentLogin({
                    fullName: latestAccount.full_name,
                    username: latestAccount.username,
                    password: latestAccount.password,
                  }).then(() => setMessage("Student login copied."))
                }
                type="button"
              >
                <Clipboard aria-hidden="true" className="size-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {classes.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-line bg-white p-5 shadow-soft"
          >
            <p className="text-sm font-bold text-muted">{item.year_group}</p>
            <h2 className="mt-1 text-xl font-extrabold">{item.name}</h2>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Roster</h2>
          <Button variant="secondary" onClick={() => void refresh()}>
            <RefreshCcw aria-hidden="true" className="size-4" />
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
  const [username, setUsername] = useState(student.username ?? "");
  const [newPassword, setNewPassword] = useState("");
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
      onMessage(
        error instanceof Error ? error.message : "Could not update name.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveCredentials = async () => {
    setBusy(true);
    onMessage(null);
    try {
      await updateManagedStudentAccount({
        studentId: student.student_id,
        username: username.trim(),
        password: newPassword.trim() || undefined,
      });
      setNewPassword("");
      await onRefresh();
      onMessage("Student login updated.");
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Could not update student login.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-3">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-extrabold">{student.full_name}</p>
          <p className="text-xs font-bold text-muted">{student.class_name}</p>
          <p className="text-xs font-bold text-muted">{student.xp} ranked XP</p>
        </div>
        {student.username ? (
          <p className="mt-1 font-mono text-xs font-bold text-primary">
            {studentLoginId(student.username)}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Public display name"
          />
          <input
            className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
          />
          <input
            className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setNewPassword(generateReadablePassword())}
          >
            <KeyRound aria-hidden="true" className="size-4" />
            New password
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void copyStudentLogin({
                fullName: student.full_name,
                username: username || student.username || "",
                password: newPassword,
              }).then(() => onMessage("Student login copied."))
            }
          >
            <Clipboard aria-hidden="true" className="size-4" />
            Copy
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void save()}
          >
            Save name
          </Button>
          <Button
            variant="secondary"
            disabled={busy || (!username.trim() && !newPassword.trim())}
            onClick={() => void saveCredentials()}
          >
            Save login
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Delete this student's account and ranked history? This cannot be undone.",
                )
              ) {
                setBusy(true);
                deleteManagedStudentAccount(student.student_id)
                  .then(async () => {
                    await onRefresh();
                    onMessage("Student account deleted.");
                  })
                  .catch((error) =>
                    onMessage(
                      error instanceof Error
                        ? error.message
                        : "Could not delete student account.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete account
          </Button>
        </div>
      </div>
    </div>
  );
}

function generateReadablePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function copyStudentLogin({
  fullName,
  username,
  password,
}: {
  fullName: string;
  username: string;
  password?: string;
}) {
  const lines = [
    `CS Revision Hub login for ${fullName}`,
    `Username: ${studentLoginId(username)}`,
  ];
  if (password) lines.push(`Password: ${password}`);
  await navigator.clipboard.writeText(lines.join("\n"));
}
