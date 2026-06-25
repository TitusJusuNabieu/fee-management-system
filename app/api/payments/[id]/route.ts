import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  await prisma.payment.delete({ where: { id } });

  await logAction({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Payment",
    entityId: id,
    details: `Deleted payment of ${payment.amount} for ${payment.student.fullName}`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ success: true });
}
