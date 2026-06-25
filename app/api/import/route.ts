import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { FACULTY_MAP } from "@/lib/utils";
import * as XLSX from "xlsx";

function parseLevel(text: string): string {
  const match = text.match(/(\d+)(ST|ND|RD|TH)\s+YEAR/i);
  if (match) return `Year ${match[1]}`;
  if (/YEAR\s*2|2ND/i.test(text)) return "Year 2";
  if (/YEAR\s*3|3RD/i.test(text)) return "Year 3";
  if (/YEAR\s*4|4TH/i.test(text)) return "Year 4";
  return "Year 1";
}

function parseProgrammeTitle(title: string) {
  const parts = title.split(/\s*[-–]\s*/).map((s) => s.trim());
  const yearPart = parts.find((p) => /\d{4}\/\d{4}/.test(p)) || "";
  const levelPart = parts.find((p) => /YEAR/i.test(p)) || "";
  const progPart = parts.find((p) => /BACHELOR|DIPLOMA|MASTER|CERTIFICATE|HIGHER/i.test(p)) || title;
  // Build full programme: degree type + specialization
  const degreePart = progPart;
  const specPart = parts.find(
    (p) => p !== degreePart && p !== levelPart && p !== yearPart && p.length > 2
  );
  const programme = specPart ? `${degreePart} - ${specPart}` : degreePart;
  return {
    programme,
    level: parseLevel(levelPart || title),
    academicYear: yearPart || `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
  };
}

type FailedRow = {
  sheet: string;
  section: string;
  row: number;
  name: string;
  idNumber: string;
  reason: string;
};

type ParsedStudent = {
  fullName: string;
  idNumber: string;
  programme: string;
  level: string;
  academicYear: string;
  expectedFees: number;
  totalPaid: number;
  rowNumber: number;
  sectionTitle: string;
};

function slugify(s: string): string {
  return s.replace(/[^A-Z0-9]/gi, "").toUpperCase().substring(0, 8);
}

function parseSheet(
  sheetName: string,
  ws: XLSX.WorkSheet
): { students: ParsedStudent[]; parseErrors: FailedRow[] } {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
    header: 1,
    defval: "",
    raw: true,
  });

  const students: ParsedStudent[] = [];
  const parseErrors: FailedRow[] = [];

  // Collect section start indices
  type Section = {
    titleIdx: number;
    title: string;
    programme: string;
    level: string;
    academicYear: string;
  };

  const sections: Section[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const cell = String(rows[ri][0]);
    if (/BACHELOR|DIPLOMA|MASTER|CERTIFICATE|HIGHER/i.test(cell)) {
      const { programme, level, academicYear } = parseProgrammeTitle(cell);
      sections.push({ titleIdx: ri, title: cell, programme, level, academicYear });
    }
  }

  // If no title rows found, try to treat the whole sheet as one section
  if (sections.length === 0) {
    const headerIdx = rows.findIndex((r) =>
      r.some((c) => String(c).toUpperCase().includes("NAME OF STUDENT"))
    );
    if (headerIdx >= 0) {
      sections.push({
        titleIdx: -1,
        title: sheetName,
        programme: sheetName,
        level: "Year 1",
        academicYear: "2025/2026",
      });
    }
  }

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const nextTitleIdx = si + 1 < sections.length ? sections[si + 1].titleIdx : rows.length;
    const sectionRows = rows.slice(sec.titleIdx + 1, nextTitleIdx);

    // Find header within this section
    const headerRelIdx = sectionRows.findIndex((r) =>
      r.some((c) => String(c).toUpperCase().includes("NAME OF STUDENT"))
    );
    if (headerRelIdx < 0) continue;

    const headerRow = sectionRows[headerRelIdx].map((c) =>
      String(c).toUpperCase().trim()
    );
    const nameCol = headerRow.findIndex((h) => h.includes("NAME OF STUDENT"));
    const matCol = headerRow.findIndex((h) => h.includes("MAT"));
    const expectedCol = headerRow.findIndex((h) => h.includes("EXPECTED"));
    const balanceColIdx = headerRow.findLastIndex((h) => h.includes("BALANCE"));

    if (nameCol < 0 || expectedCol < 0) continue;

    const sectionLabel = sec.title.substring(0, 60);

    for (let ri = headerRelIdx + 1; ri < sectionRows.length; ri++) {
      const row = sectionRows[ri];
      const no = row[0];
      if (typeof no !== "number" || !Number.isInteger(no) || no < 1) continue;

      const fullName = String(row[nameCol] ?? "").trim();
      const matNo = matCol >= 0 ? String(row[matCol] ?? "").trim() : "";
      const expectedFees =
        typeof row[expectedCol] === "number" ? (row[expectedCol] as number) : NaN;
      const balanceValue =
        balanceColIdx >= 0 && typeof row[balanceColIdx] === "number"
          ? (row[balanceColIdx] as number)
          : NaN;
      const totalPaid =
        !isNaN(expectedFees) && !isNaN(balanceValue) ? expectedFees - balanceValue : 0;

      const absoluteRow = sec.titleIdx + 1 + headerRelIdx + 1 + ri + 1;

      if (!fullName) {
        parseErrors.push({
          sheet: sheetName,
          section: sectionLabel,
          row: absoluteRow,
          name: "(blank)",
          idNumber: "",
          reason: "Missing student name",
        });
        continue;
      }
      if (isNaN(expectedFees) || expectedFees <= 0) {
        parseErrors.push({
          sheet: sheetName,
          section: sectionLabel,
          row: absoluteRow,
          name: fullName,
          idNumber: matNo,
          reason: "Missing or zero expected fees",
        });
        continue;
      }

      // Make ID unique per enrolment: use MAT if available, otherwise derive from section + row
      const yearSuffix = sec.academicYear.replace("/", "");
      const levelSuffix = sec.level.replace(" ", "");
      const idNumber =
        matNo && matNo !== "0" && matNo.length > 1
          ? `${matNo}-${yearSuffix}-${levelSuffix}`
          : `${slugify(sheetName)}-${slugify(sec.programme)}-${String(no).padStart(3, "0")}-${yearSuffix}-${levelSuffix}`;

      students.push({
        fullName,
        idNumber,
        programme: sec.programme,
        level: sec.level,
        academicYear: sec.academicYear,
        expectedFees,
        totalPaid: Math.max(0, totalPaid),
        rowNumber: absoluteRow,
        sectionTitle: sectionLabel,
      });
    }
  }

  return { students, parseErrors };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const results = {
    created: 0,
    skipped: 0,
    paymentsRecorded: 0,
    errors: [] as string[],
    failedRows: [] as FailedRow[],
    sheets: [] as string[],
  };

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const { students, parseErrors } = parseSheet(sheetName, ws);

    results.failedRows.push(...parseErrors);

    if (students.length === 0 && parseErrors.length === 0) {
      results.errors.push(`Sheet "${sheetName}": no student rows found`);
      continue;
    }

    results.sheets.push(`${sheetName} (${students.length})`);

    for (const s of students) {
      const existing = await prisma.student.findUnique({ where: { idNumber: s.idNumber } });

      if (existing) {
        results.skipped++;
        results.failedRows.push({
          sheet: sheetName,
          section: s.sectionTitle,
          row: s.rowNumber,
          name: s.fullName,
          idNumber: s.idNumber,
          reason: "Duplicate — student with this ID already exists",
        });
        continue;
      }

      const student = await prisma.student.create({
        data: {
          fullName: s.fullName,
          idNumber: s.idNumber,
          programme: s.programme,
          academicYear: s.academicYear,
          level: s.level,
          expectedFees: s.expectedFees,
        },
      });

      results.created++;

      if (s.totalPaid > 0) {
        await prisma.payment.create({
          data: {
            studentId: student.id,
            amount: s.totalPaid,
            notes: `Imported from ${sheetName} · ${s.sectionTitle}`,
            createdById: session.user.id,
          },
        });
        results.paymentsRecorded++;
      }
    }
  }

  await logAction({
    userId: session.user.id,
    action: "IMPORT",
    entityType: "Student",
    details: `Imported ${results.created} students from ${results.sheets.join(", ")}. Skipped: ${results.skipped}. Failed rows: ${results.failedRows.length}`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(results);
}
