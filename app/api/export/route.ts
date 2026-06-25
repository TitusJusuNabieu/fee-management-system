import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx";
  const academicYear = searchParams.get("academicYear") || "";
  const level = searchParams.get("level") || "";

  const students = await prisma.student.findMany({
    where: {
      ...(academicYear && { academicYear }),
      ...(level && { level }),
    },
    include: { payments: { select: { amount: true } } },
    orderBy: { fullName: "asc" },
  });

  const data = students.map((s) => {
    const feesPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      "Full Name": s.fullName,
      "ID Number": s.idNumber,
      Programme: s.programme,
      "Academic Year": s.academicYear,
      Level: s.level,
      "Expected Fees": s.expectedFees,
      "Fees Paid": feesPaid,
      Balance: s.expectedFees - feesPaid,
      Status:
        feesPaid <= 0 ? "Unpaid" : feesPaid >= s.expectedFees ? "Fully Paid" : "Partial",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students-${Date.now()}.csv"`,
      },
    });
  }

  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(xlsxBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="students-${Date.now()}.xlsx"`,
    },
  });
}
