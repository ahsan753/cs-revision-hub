export interface StudentImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  className: string;
}

export interface StudentImportResult {
  sheetName: string;
  students: StudentImportRow[];
  errors: string[];
}

type ColumnMap = {
  firstName?: number;
  lastName?: number;
  fullName?: number;
  className?: number;
};

export const studentImportExampleRows = [
  ["First name", "Surname", "Class"],
  ["Ece", "Akseli", "Year 10 CS Set 1"],
  ["Jeronimo", "Amador Lozano", "Year 10 CS Set 1"],
  ["Pietro", "Filho", "Year 11 CS Set 2"],
];

export async function parseStudentWorkbook(
  buffer: ArrayBuffer,
): Promise<StudentImportResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0] ?? "";
  const worksheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!worksheet) {
    return {
      sheetName,
      students: [],
      errors: ["The workbook does not contain a readable worksheet."],
    };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
  const header = findHeaderRow(rows);
  if (!header) {
    return {
      sheetName,
      students: [],
      errors: [
        "Add columns named Surname and Forename, or Last name and First name.",
      ],
    };
  }

  const students: StudentImportRow[] = [];
  const errors: string[] = [];

  rows.slice(header.index + 1).forEach((row, offset) => {
    const rowNumber = header.index + offset + 2;
    const firstName =
      header.columns.firstName !== undefined
        ? cleanCell(row[header.columns.firstName])
        : "";
    const lastName =
      header.columns.lastName !== undefined
        ? cleanCell(row[header.columns.lastName])
        : "";
    const fullName =
      header.columns.fullName !== undefined
        ? cleanCell(row[header.columns.fullName])
        : "";
    const className =
      header.columns.className !== undefined
        ? cleanCell(row[header.columns.className])
        : "";
    const names =
      firstName || lastName ? { firstName, lastName } : splitFullName(fullName);

    if (!names.firstName && !names.lastName && !className) return;
    if (!names.firstName || !names.lastName) {
      errors.push(`Row ${rowNumber}: first name and surname are required.`);
      return;
    }

    students.push({
      rowNumber,
      firstName: names.firstName,
      lastName: names.lastName,
      className,
    });
  });

  if (!students.length && !errors.length) {
    errors.push("No student names were found below the header row.");
  }

  return { sheetName, students, errors };
}

export async function downloadStudentImportTemplate() {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(studentImportExampleRows);
  worksheet["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 24 }];
  worksheet["!autofilter"] = { ref: "A1:C1" };
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  const helpSheet = XLSX.utils.aoa_to_sheet([
    ["How to import"],
    ["Keep the first row as headings."],
    ["Add one student per row."],
    ["Use the Class column to create or reuse classes automatically."],
    ["Leave Class blank only when importing into a selected class."],
  ]);
  helpSheet["!cols"] = [{ wch: 64 }];
  XLSX.utils.book_append_sheet(workbook, helpSheet, "Guide");
  XLSX.writeFile(workbook, "student-roster-import-example.xlsx");
}

function findHeaderRow(rows: unknown[][]) {
  for (let index = 0; index < Math.min(rows.length, 10); index += 1) {
    const columns = mapColumns(rows[index]);
    if (
      (columns.firstName !== undefined && columns.lastName !== undefined) ||
      columns.fullName !== undefined
    ) {
      return { index, columns };
    }
  }
  return null;
}

function mapColumns(row: unknown[]): ColumnMap {
  return row.reduce<ColumnMap>((columns, value, index) => {
    const header = normaliseHeader(cleanCell(value));
    if (["forename", "firstname", "givenname"].includes(header)) {
      columns.firstName = index;
    }
    if (["surname", "lastname", "familyname"].includes(header)) {
      columns.lastName = index;
    }
    if (["fullname", "studentname", "name"].includes(header)) {
      columns.fullName = index;
    }
    if (
      ["class", "classname", "teachinggroup", "group", "set"].includes(header)
    ) {
      columns.className = index;
    }
    return columns;
  }, {});
}

function splitFullName(value: string) {
  const parts = value.split(" ").filter(Boolean);
  if (parts.length < 2) return { firstName: value, lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function cleanCell(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normaliseHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
