import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const programme = searchParams.get("programme") || "";
  const academicYear = searchParams.get("academicYear") || "";
  const level = searchParams.get("level") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where = {
    AND: [
      search
        ? {
            OR: [
              { fullName: { contains: search } },
              { idNumber: { contains: search } },
              { programme: { contains: search } },
            ],
          }
        : {},
      programme ? { programme } : {},
      academicYear ? { academicYear } : {},
      level ? { level } : {},
    ],
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  const studentsWithTotals = students.map((s) => ({
    ...s,
    feesPaid: s.payments.reduce((sum, p) => sum + p.amount, 0),
    payments: undefined,
  }));

  return NextResponse.json({ students: studentsWithTotals, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { fullName, idNumber, programme, academicYear, level, expectedFees } = body;

  if (!fullName || !idNumber || !programme || !academicYear || !level || expectedFees == null) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const existing = await prisma.student.findUnique({ where: { idNumber } });
  if (existing) {
    return NextResponse.json({ error: "A student with this ID number already exists" }, { status: 409 });
  }

  const student = await prisma.student.create({
    data: { fullName, idNumber, programme, academicYear, level, expectedFees: parseFloat(expectedFees) },
  });

  await logAction({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Student",
    entityId: student.id,
    details: `Created student ${student.fullName} (${student.idNumber})`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(student, { status: 201 });
}
