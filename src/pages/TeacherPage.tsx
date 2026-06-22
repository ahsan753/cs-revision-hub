import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronRight,
  Clipboard,
  Download,
  FileSpreadsheet,
  KeyRound,
  Pencil,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { studentLoginId } from "../auth/studentCredentials";
import { Button } from "../components/ui/Button";
import { contentIndex } from "../content/contentIndex";
import {
  bulkCreateManagedStudentAccounts,
  createClass,
  createManagedStudentAccount,
  deleteManagedClass,
  deleteManagedStudentAccount,
  getTeacherClassActivity,
  getTeacherClassRoster,
  getTeacherClassSummaries,
  getTeacherClassWeakAreas,
  updateManagedStudentAccount,
  type CreatedStudentAccount,
  type TeacherClassActivityRow,
  type TeacherClassRosterRow,
  type TeacherClassSummary,
  type TeacherClassWeakAreaRow,
} from "../teacher/teacherClient";
import {
  downloadStudentImportTemplate,
  parseStudentWorkbook,
  studentImportExampleRows,
  type StudentImportRow,
} from "../teacher/studentImport";

export function TeacherPage() {
  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteClass, setPendingDeleteClass] =
    useState<TeacherClassSummary | null>(null);
  const [deleteClassBusy, setDeleteClassBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setClasses(await getTeacherClassSummaries());
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load the teacher portal.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(
    () => ({
      classes: classes.length,
      students: classes.reduce((sum, item) => sum + item.student_count, 0),
      active: classes.reduce((sum, item) => sum + item.active_this_week, 0),
    }),
    [classes],
  );

  const confirmDeleteClass = async () => {
    if (!pendingDeleteClass) return;
    setDeleteClassBusy(true);
    setMessage(null);
    try {
      await deleteManagedClass(pendingDeleteClass.id);
      setPendingDeleteClass(null);
      await refresh();
      setMessage("Class deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete class.",
      );
    } finally {
      setDeleteClassBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PortalHeader
        title="Teacher Portal"
        description="Manage classes, student accounts, rosters, and ranked progress."
        action={
          <Button variant="secondary" onClick={() => void refresh()}>
            <RefreshCcw aria-hidden="true" className="size-4" />
            Refresh
          </Button>
        }
      />

      <Notice message={message} />

      <section className="grid gap-4 md:grid-cols-3">
        <StatTile
          icon={<BookOpenCheck aria-hidden="true" className="size-5" />}
          label="Classes"
          value={totals.classes}
        />
        <StatTile
          icon={<Users aria-hidden="true" className="size-5" />}
          label="Students"
          value={totals.students}
        />
        <StatTile
          icon={<Pencil aria-hidden="true" className="size-5" />}
          label="Active this week"
          value={totals.active}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <CreateClassPanel onCreated={refresh} onMessage={setMessage} />
        <StudentAccountPanel
          classes={classes}
          onCreated={refresh}
          onMessage={setMessage}
        />
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Classes</h2>
            <p className="mt-1 text-sm font-bold text-muted">
              Open a class to manage its roster and progress.
            </p>
          </div>
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-extrabold text-muted">
            {loading ? "Loading..." : `${classes.length} total`}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {classes.length ? (
            classes.map((item) => (
              <ClassSummaryRow
                key={item.id}
                item={item}
                onDelete={() => setPendingDeleteClass(item)}
              />
            ))
          ) : (
            <EmptyState
              title="No classes yet"
              body="Create your first class, then generate student logins for that roster."
            />
          )}
        </div>
      </section>

      <ConfirmClassDeleteDialog
        item={pendingDeleteClass}
        busy={deleteClassBusy}
        onCancel={() => setPendingDeleteClass(null)}
        onConfirm={confirmDeleteClass}
      />
    </div>
  );
}

export function TeacherClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [roster, setRoster] = useState<TeacherClassRosterRow[]>([]);
  const [activity, setActivity] = useState<TeacherClassActivityRow[]>([]);
  const [weakAreas, setWeakAreas] = useState<TeacherClassWeakAreaRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] =
    useState<TeacherClassRosterRow | null>(null);
  const [pendingDeleteClass, setPendingDeleteClass] =
    useState<TeacherClassSummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteClassBusy, setDeleteClassBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const [classRows, rosterRows, activityRows, weakAreaRows] =
        await Promise.all([
          getTeacherClassSummaries(),
          getTeacherClassRoster(classId),
          getTeacherClassActivity(classId, 20),
          getTeacherClassWeakAreas(classId),
        ]);
      setClasses(classRows);
      setRoster(rosterRows);
      setActivity(activityRows);
      setWeakAreas(weakAreaRows);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load this class.",
      );
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentClass = classes.find((item) => item.id === classId);
  const averageAccuracy = weakAreas.length
    ? Math.max(
        0,
        Math.round(
          100 -
            (weakAreas.reduce((sum, item) => sum + item.miss_count, 0) /
              Math.max(
                1,
                weakAreas.reduce((sum, item) => sum + item.attempts, 0),
              )) *
              100,
        ),
      )
    : 100;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setMessage(null);
    try {
      await deleteManagedStudentAccount(pendingDelete.student_id);
      setPendingDelete(null);
      await refresh();
      setMessage("Student account deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete student account.",
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDeleteClass = async () => {
    if (!pendingDeleteClass) return;
    setDeleteClassBusy(true);
    setMessage(null);
    try {
      await deleteManagedClass(pendingDeleteClass.id);
      setPendingDeleteClass(null);
      navigate("/teacher");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete class.",
      );
    } finally {
      setDeleteClassBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/teacher"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-extrabold text-ink shadow-soft hover:border-primary hover:text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Classes
        </Link>
        <div className="flex flex-wrap gap-2">
          {currentClass ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => setPendingDeleteClass(currentClass)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete class
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => void refresh()}>
            <RefreshCcw aria-hidden="true" className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <PortalHeader
        title={currentClass?.name ?? "Class"}
        description={
          currentClass
            ? `${currentClass.year_group} roster, accounts, and ranked progress`
            : loading
              ? "Loading class details..."
              : "This class could not be found."
        }
      />

      <Notice message={message} />

      <section className="grid gap-4 md:grid-cols-4">
        <StatTile
          icon={<Users aria-hidden="true" className="size-5" />}
          label="Students"
          value={roster.length}
        />
        <StatTile
          icon={<BookOpenCheck aria-hidden="true" className="size-5" />}
          label="Average XP"
          value={currentClass?.average_xp ?? 0}
        />
        <StatTile
          icon={<Pencil aria-hidden="true" className="size-5" />}
          label="Active this week"
          value={currentClass?.active_this_week ?? 0}
        />
        <StatTile
          icon={<ShieldAlert aria-hidden="true" className="size-5" />}
          label="Weak-area accuracy"
          value={`${averageAccuracy}%`}
        />
      </section>

      {classId ? (
        <StudentAccountPanel
          classes={classes}
          lockedClassId={classId}
          onCreated={refresh}
          onMessage={setMessage}
        />
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Roster</h2>
            <p className="mt-1 text-sm font-bold text-muted">
              Edit student details, move classes, reset logins, or delete an
              account.
            </p>
          </div>
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-extrabold text-muted">
            {loading ? "Loading..." : `${roster.length} students`}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          {roster.length ? (
            <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs font-extrabold uppercase tracking-normal text-muted">
                  <th className="border-b border-line px-3 py-3">Student</th>
                  <th className="border-b border-line px-3 py-3">Login</th>
                  <th className="border-b border-line px-3 py-3">Class</th>
                  <th className="border-b border-line px-3 py-3">Progress</th>
                  <th className="border-b border-line px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((student) => (
                  <StudentRosterRow
                    key={student.student_id}
                    student={student}
                    classes={classes}
                    onRefresh={refresh}
                    onMessage={setMessage}
                    onDelete={() => setPendingDelete(student)}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No students in this class"
              body="Add a student login above and it will appear in this roster."
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ActivityPanel rows={activity} />
        <WeakAreasPanel rows={weakAreas} />
      </section>

      <ConfirmDeleteDialog
        student={pendingDelete}
        busy={deleteBusy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmClassDeleteDialog
        item={pendingDeleteClass}
        busy={deleteClassBusy}
        onCancel={() => setPendingDeleteClass(null)}
        onConfirm={confirmDeleteClass}
      />
    </div>
  );
}

function PortalHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: JSX.Element;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-bold text-muted">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
      {message}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: JSX.Element;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-primary">
          {icon}
        </span>
        <p className="text-sm font-extrabold text-muted">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-ink">{value}</p>
    </div>
  );
}

function CreateClassPanel({
  onCreated,
  onMessage,
}: {
  onCreated: () => Promise<void>;
  onMessage: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("Year 10");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    onMessage(null);
    try {
      await createClass(name, yearGroup);
      setName("");
      await onCreated();
      onMessage("Class created.");
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Could not create class.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Plus aria-hidden="true" className="size-5 text-primary" />
        <h2 className="text-lg font-extrabold">Create class</h2>
      </div>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
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
          placeholder="Year group"
        />
        <Button disabled={busy || !name.trim() || !yearGroup.trim()}>
          {busy ? "Creating..." : "Create class"}
        </Button>
      </form>
    </section>
  );
}

function StudentAccountPanel({
  classes,
  lockedClassId,
  onCreated,
  onMessage,
}: {
  classes: TeacherClassSummary[];
  lockedClassId?: string;
  onCreated: () => Promise<void>;
  onMessage: (message: string | null) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classId, setClassId] = useState(lockedClassId ?? classes[0]?.id ?? "");
  const [latestAccount, setLatestAccount] =
    useState<CreatedStudentAccount | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<StudentImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedAccounts, setImportedAccounts] = useState<
    CreatedStudentAccount[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    setClassId((current) => lockedClassId ?? (current || classes[0]?.id || ""));
  }, [classes, lockedClassId]);

  const selectedClass = classes.find((item) => item.id === classId);
  const importUsesSpreadsheetClasses = importRows.some(
    (student) => student.className.trim().length > 0,
  );
  const importNeedsSelectedClass =
    importRows.length > 0 &&
    !classId.trim() &&
    importRows.some((student) => !student.className.trim());
  const importTargetLabel = importUsesSpreadsheetClasses
    ? "Classes from spreadsheet"
    : (selectedClass?.name ?? "Choose class");

  const handleImportFile = async (file: File | null) => {
    setImportedAccounts([]);
    setImportRows([]);
    setImportErrors([]);
    setImportFileName(file?.name ?? "");
    onMessage(null);

    if (!file) return;

    try {
      const result = await parseStudentWorkbook(await file.arrayBuffer());
      setImportRows(result.students);
      setImportErrors(result.errors);
      if (result.students.length) {
        onMessage(
          `Found ${result.students.length} student${
            result.students.length === 1 ? "" : "s"
          } in ${result.sheetName || file.name}.`,
        );
      }
    } catch (error) {
      setImportErrors([
        error instanceof Error ? error.message : "Could not read the file.",
      ]);
    }
  };

  const importStudents = async () => {
    setImportBusy(true);
    setImportedAccounts([]);
    onMessage(null);
    try {
      const result = await bulkCreateManagedStudentAccounts({
        classId: classId.trim() || undefined,
        students: importRows,
      });
      setImportedAccounts(result.created);
      setImportRows([]);
      setImportErrors(
        result.errors.map(
          (item) =>
            `Row ${importRows[item.index]?.rowNumber ?? item.index + 1}: ${
              item.error
            }`,
        ),
      );
      await onCreated();
      onMessage(
        `Imported ${result.created.length} student login${
          result.created.length === 1 ? "" : "s"
        }.`,
      );
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Could not import student logins.",
      );
    } finally {
      setImportBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setLatestAccount(null);
    onMessage(null);
    try {
      const account = await createManagedStudentAccount({
        firstName,
        lastName,
        classId,
      });
      setLatestAccount(account);
      setFirstName("");
      setLastName("");
      await onCreated();
      onMessage(`Login created for ${account.full_name}.`);
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Could not create student login.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <UserPlus aria-hidden="true" className="size-5 text-primary" />
        <h2 className="text-lg font-extrabold">Add student</h2>
      </div>
      <form
        className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]"
        onSubmit={submit}
      >
        <input
          className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="First name"
          autoComplete="off"
        />
        <input
          className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Last name"
          autoComplete="off"
        />
        {lockedClassId ? (
          <div className="flex min-h-11 items-center rounded-lg border border-line bg-slate-50 px-3 text-sm font-extrabold text-muted">
            {selectedClass?.name ?? "Selected class"}
          </div>
        ) : (
          <select
            className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-bold outline-none focus:border-primary"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            <option value="">Choose class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
        <Button
          disabled={
            busy || !firstName.trim() || !lastName.trim() || !classId.trim()
          }
        >
          {busy ? "Creating..." : "Generate"}
        </Button>
      </form>

      {latestAccount ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-extrabold text-emerald-800">
            Login created for {latestAccount.full_name}
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
              type="button"
              onClick={() =>
                void copyStudentLogin({
                  fullName: latestAccount.full_name,
                  username: latestAccount.username,
                  password: latestAccount.password,
                }).then(() => onMessage("Student login copied."))
              }
            >
              <Clipboard aria-hidden="true" className="size-4" />
              Copy
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet
              aria-hidden="true"
              className="size-5 text-primary"
            />
            <h3 className="text-base font-extrabold">Import spreadsheet</h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3 py-2"
            onClick={() => void downloadStudentImportTemplate()}
          >
            <Download aria-hidden="true" className="size-4" />
            Example
          </Button>
        </div>

        <p className="mt-3 text-sm font-bold leading-6 text-muted">
          Upload a roster with First name, Surname, and Class columns. The app
          will create any new classes from the Class column and place each
          student into the right class automatically.
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="min-w-[480px] w-full text-left text-xs font-bold">
            <thead className="bg-slate-50 text-muted">
              <tr>
                {studentImportExampleRows[0].map((heading) => (
                  <th key={heading} className="px-3 py-2">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentImportExampleRows.slice(1).map((row) => (
                <tr key={row.join("|")} className="border-t border-line">
                  {row.map((cell) => (
                    <td key={cell} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-slate-50 px-3 text-sm font-bold text-muted hover:border-primary hover:text-primary">
            <Upload aria-hidden="true" className="size-4" />
            <span>{importFileName || "Choose .xlsx, .xls, or .csv file"}</span>
            <input
              className="sr-only"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) =>
                void handleImportFile(event.currentTarget.files?.[0] ?? null)
              }
            />
          </label>
          <Button
            type="button"
            disabled={
              importBusy ||
              importNeedsSelectedClass ||
              importRows.length === 0 ||
              importRows.length > 100
            }
            onClick={() => void importStudents()}
          >
            {importBusy ? "Importing..." : `Import ${importRows.length || ""}`}
          </Button>
        </div>

        {importRows.length ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-ink">
                {importRows.length} ready to import
              </p>
              <p className="text-xs font-bold text-muted">
                {importTargetLabel}
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {importRows.slice(0, 6).map((student) => (
                <div
                  key={`${student.rowNumber}-${student.firstName}-${student.lastName}`}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold"
                >
                  <span className="block">
                    {student.firstName} {student.lastName}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {student.className || selectedClass?.name || "No class"}
                  </span>
                </div>
              ))}
            </div>
            {importRows.length > 6 ? (
              <p className="mt-2 text-xs font-bold text-muted">
                +{importRows.length - 6} more
              </p>
            ) : null}
          </div>
        ) : null}

        {importErrors.length ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            {importErrors.slice(0, 4).map((error) => (
              <p key={error}>{error}</p>
            ))}
            {importErrors.length > 4 ? (
              <p>+{importErrors.length - 4} more rows need checking.</p>
            ) : null}
          </div>
        ) : null}

        {importedAccounts.length ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-emerald-800">
                {importedAccounts.length} logins created
              </p>
              <Button
                variant="success"
                type="button"
                className="min-h-10 px-3 py-2"
                onClick={() =>
                  void copyStudentLogins(importedAccounts).then(() =>
                    onMessage("Imported student logins copied."),
                  )
                }
              >
                <Clipboard aria-hidden="true" className="size-4" />
                Copy all
              </Button>
            </div>
            <div className="mt-3 max-h-56 overflow-auto rounded-lg bg-white">
              {importedAccounts.map((account) => (
                <div
                  key={account.student_id}
                  className="grid gap-1 border-b border-line px-3 py-2 text-xs font-bold last:border-0 md:grid-cols-[1fr_0.8fr_1fr_1fr]"
                >
                  <span>{account.full_name}</span>
                  <span>{account.class_name}</span>
                  <span className="font-mono">
                    {studentLoginId(account.username)}
                  </span>
                  <span className="font-mono">{account.password}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ClassSummaryRow({
  item,
  onDelete,
}: {
  item: TeacherClassSummary;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-line bg-slate-50 p-4 transition hover:border-primary hover:bg-white md:grid-cols-[1fr_auto] md:items-center">
      <Link
        to={`/teacher/classes/${item.id}`}
        className="grid gap-3 md:grid-cols-[1.2fr_0.6fr_0.6fr_0.7fr_auto] md:items-center"
      >
        <div>
          <p className="text-sm font-bold text-muted">{item.year_group}</p>
          <h3 className="mt-1 text-lg font-extrabold">{item.name}</h3>
        </div>
        <Metric label="Students" value={item.student_count} />
        <Metric label="Average XP" value={item.average_xp} />
        <Metric
          label="Latest activity"
          value={formatDateTime(item.latest_activity_at)}
        />
        <ChevronRight aria-hidden="true" className="size-5 text-primary" />
      </Link>
      <Button
        type="button"
        variant="danger"
        className="min-h-10 px-3 py-2"
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </Button>
    </div>
  );
}

function StudentRosterRow({
  student,
  classes,
  onRefresh,
  onMessage,
  onDelete,
}: {
  student: TeacherClassRosterRow;
  classes: TeacherClassSummary[];
  onRefresh: () => Promise<void>;
  onMessage: (message: string | null) => void;
  onDelete: () => void;
}) {
  const [fullName, setFullName] = useState(student.full_name);
  const [displayName, setDisplayName] = useState(student.display_name ?? "");
  const [classId, setClassId] = useState(student.class_id);
  const [username, setUsername] = useState(student.username ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(student.full_name);
    setDisplayName(student.display_name ?? "");
    setClassId(student.class_id);
    setUsername(student.username ?? "");
  }, [student]);

  const saveDetails = async () => {
    setBusy(true);
    onMessage(null);
    try {
      await updateManagedStudentAccount({
        studentId: student.student_id,
        fullName: fullName.trim(),
        displayName: displayName.trim() || null,
        classId,
      });
      await onRefresh();
      onMessage("Student details updated.");
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Could not update student details.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveLogin = async () => {
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
    <tr className="align-top">
      <td className="border-b border-line px-3 py-4">
        <div className="grid gap-2">
          <input
            className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
          />
          <input
            className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name"
          />
        </div>
      </td>
      <td className="border-b border-line px-3 py-4">
        <div className="grid gap-2">
          <input
            className="min-h-10 rounded-lg border border-line px-3 font-mono text-xs font-bold outline-none focus:border-primary"
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
          {student.username ? (
            <p className="font-mono text-xs font-extrabold text-primary">
              {studentLoginId(student.username)}
            </p>
          ) : null}
        </div>
      </td>
      <td className="border-b border-line px-3 py-4">
        <select
          className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-bold outline-none focus:border-primary"
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
        >
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </td>
      <td className="border-b border-line px-3 py-4">
        <div className="grid gap-1 text-sm font-bold">
          <span>{student.xp} XP</span>
          <span className="text-muted">Level {student.level}</span>
          <span className="text-muted">{student.streak} day streak</span>
          <span className="text-xs text-muted">
            Last: {formatDateTime(student.last_answer_at)}
          </span>
        </div>
      </td>
      <td className="border-b border-line px-3 py-4">
        <div className="flex w-[18rem] flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3 py-2"
            disabled={busy || !fullName.trim() || !classId}
            onClick={() => void saveDetails()}
          >
            Save details
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3 py-2"
            disabled={busy || (!username.trim() && !newPassword.trim())}
            onClick={() => void saveLogin()}
          >
            Save login
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3 py-2"
            disabled={busy}
            onClick={() => setNewPassword(generateReadablePassword())}
          >
            <KeyRound aria-hidden="true" className="size-4" />
            Reset
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3 py-2"
            disabled={busy || !(username || student.username)}
            onClick={() =>
              void copyStudentLogin({
                fullName,
                username: username || student.username || "",
                password: newPassword.trim() || undefined,
              }).then(() => onMessage("Student login copied."))
            }
          >
            <Clipboard aria-hidden="true" className="size-4" />
            Copy
          </Button>
          <Button
            type="button"
            variant="danger"
            className="min-h-10 px-3 py-2"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ActivityPanel({ rows }: { rows: TeacherClassActivityRow[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <h2 className="text-lg font-extrabold">Recent ranked activity</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((item) => (
            <div key={item.event_id} className="rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold">{item.student_name}</p>
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-extrabold ${
                    item.correct
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {item.correct ? "Correct" : "Missed"}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-muted">
                {getContentLabel(item.item_id)}
              </p>
              <p className="mt-1 text-xs font-bold text-muted">
                {item.activity} - {item.xp_awarded} XP -{" "}
                {formatDateTime(item.created_at)}
              </p>
            </div>
          ))
        ) : (
          <EmptyState
            title="No ranked activity yet"
            body="Student ranked answers will appear here after they practise."
          />
        )}
      </div>
    </section>
  );
}

function WeakAreasPanel({ rows }: { rows: TeacherClassWeakAreaRow[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <h2 className="text-lg font-extrabold">Weak areas</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((item) => {
            const accuracy = Math.round(
              (item.correct_attempts / Math.max(1, item.attempts)) * 100,
            );
            return (
              <div key={item.item_id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold">
                    {getContentLabel(item.item_id)}
                  </p>
                  <span className="text-xs font-extrabold text-rose-600">
                    {accuracy}% accuracy
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-muted">
                  {item.miss_count} misses across {item.affected_students}{" "}
                  students - last {formatDateTime(item.last_attempt_at)}
                </p>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="No weak areas yet"
            body="Missed ranked answers will surface here once students have activity."
          />
        )}
      </div>
    </section>
  );
}

function ConfirmDeleteDialog({
  student,
  busy,
  onCancel,
  onConfirm,
}: {
  student: TeacherClassRosterRow | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!student) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-pop">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-rose-50 text-rose-700">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">Delete student account</h2>
            <p className="text-sm font-bold text-muted">{student.full_name}</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-bold text-muted">
          This permanently deletes the student login and ranked history. This
          cannot be undone.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmClassDeleteDialog({
  item,
  busy,
  onCancel,
  onConfirm,
}: {
  item: TeacherClassSummary | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-pop">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-rose-50 text-rose-700">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">Delete class</h2>
            <p className="text-sm font-bold text-muted">{item.name}</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-bold text-muted">
          This permanently deletes the class. Any CS Revision Hub student logins
          in this class and their ranked history will also be deleted.
          School-email students are removed from the class, not deleted.
        </p>
        {item.student_count > 0 ? (
          <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-extrabold text-rose-700">
            {item.student_count} student{item.student_count === 1 ? "" : "s"}{" "}
            will be affected.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "Deleting..." : "Delete class"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-sm font-extrabold text-ink">{title}</p>
      <p className="mt-1 text-sm font-bold text-muted">{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-normal text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-ink">{value}</p>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

async function copyStudentLogins(accounts: CreatedStudentAccount[]) {
  await navigator.clipboard.writeText(
    accounts
      .map((account) =>
        [
          account.full_name,
          `Class: ${account.class_name}`,
          `Username: ${studentLoginId(account.username)}`,
          `Password: ${account.password}`,
        ].join("\n"),
      )
      .join("\n\n"),
  );
}

function getContentLabel(itemId: string) {
  return contentLabelMap.get(itemId) ?? itemId;
}

const contentLabelMap = (() => {
  const labels = new Map<string, string>();
  for (const unit of contentIndex.units) {
    for (const item of unit.flashcards) {
      labels.set(item.id, `${item.subtopic} ${item.term}`);
    }
    for (const item of unit.mcqs) {
      labels.set(item.id, `${item.subtopic} ${item.question}`);
    }
    for (const item of unit.codeTasks ?? []) {
      labels.set(item.id, `${item.subtopic} ${item.prompt}`);
    }
  }
  return labels;
})();
