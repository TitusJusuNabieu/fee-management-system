import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { studentId, amount, paymentDate, reference, notes } = body;

  if (!studentId || !amount) {
    return NextResponse.json({ error: "studentId and amount are required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const payment = await prisma.payment.create({
    data: {
      studentId,
      amount: parseFloat(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      reference: reference || null,
      notes: notes || null,
      createdById: session.user.id,
    },
  });

  await logAction({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
    details: `Added payment of ${amount} for ${student.fullName}`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(payment, { status: 201 });
}
