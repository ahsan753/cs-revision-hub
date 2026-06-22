import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseStudentWorkbook } from "./studentImport";

describe("parseStudentWorkbook", () => {
  it("reads the exported Surname and Forename layout", async () => {
    const result = await parseStudentWorkbook(
      workbookBuffer([
        ["Surname", "Forename"],
        ["Akseli", "Ece"],
        ["Amador Lozano", "Jeronimo"],
      ]),
    );

    expect(result.errors).toEqual([]);
    expect(result.students).toEqual([
      { rowNumber: 2, firstName: "Ece", lastName: "Akseli", className: "" },
      {
        rowNumber: 3,
        firstName: "Jeronimo",
        lastName: "Amador Lozano",
        className: "",
      },
    ]);
  });

  it("accepts first name and last name aliases", async () => {
    const result = await parseStudentWorkbook(
      workbookBuffer([
        ["First name", "Last name"],
        ["Pietro", "Filho"],
      ]),
    );

    expect(result.errors).toEqual([]);
    expect(result.students[0]).toMatchObject({
      firstName: "Pietro",
      lastName: "Filho",
      className: "",
    });
  });

  it("reads class names for automatic class sorting", async () => {
    const result = await parseStudentWorkbook(
      workbookBuffer([
        ["First name", "Surname", "Class"],
        ["Ece", "Akseli", "Year 10 CS Set 1"],
        ["Pietro", "Filho", "Year 11 CS Set 2"],
      ]),
    );

    expect(result.errors).toEqual([]);
    expect(result.students).toEqual([
      {
        rowNumber: 2,
        firstName: "Ece",
        lastName: "Akseli",
        className: "Year 10 CS Set 1",
      },
      {
        rowNumber: 3,
        firstName: "Pietro",
        lastName: "Filho",
        className: "Year 11 CS Set 2",
      },
    ]);
  });

  it("reports incomplete student rows", async () => {
    const result = await parseStudentWorkbook(
      workbookBuffer([
        ["Surname", "Forename"],
        ["Ozkan", ""],
      ]),
    );

    expect(result.students).toEqual([]);
    expect(result.errors).toEqual([
      "Row 2: first name and surname are required.",
    ]);
  });
});

function workbookBuffer(rows: string[][]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}
