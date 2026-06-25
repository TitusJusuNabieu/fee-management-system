import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const feesPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({ ...student, feesPaid });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { fullName, idNumber, programme, academicYear, level, expectedFees } = body;

  // Check if another student already uses that ID number
  if (idNumber) {
    const clash = await prisma.student.findFirst({
      where: { idNumber, NOT: { id } },
    });
    if (clash) return NextResponse.json({ error: "ID number already in use" }, { status: 409 });
  }

  const student = await prisma.student.update({
    where: { id },
    data: {
      ...(fullName && { fullName }),
      ...(idNumber && { idNumber }),
      ...(programme && { programme }),
      ...(academicYear && { academicYear }),
      ...(level && { level }),
      ...(expectedFees != null && { expectedFees: parseFloat(expectedFees) }),
    },
  });

  await logAction({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Student",
    entityId: student.id,
    details: `Updated student ${student.fullName}`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(student);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  await prisma.student.delete({ where: { id } });

  await logAction({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Student",
    entityId: id,
    details: `Deleted student ${student.fullName} (${student.idNumber})`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ success: true });
}
