import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { logAction } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, email, role, isActive, password } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) updateData.password = await hash(password, 12);

  if (email) {
    const clash = await prisma.user.findFirst({ where: { email, NOT: { id } } });
    if (clash) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  await logAction({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    details: `Updated user ${user.name}`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Prevent deleting yourself
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Check if this would leave no admins
  const adminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (targetUser?.role === "SUPER_ADMIN" && adminCount <= 1) {
    return NextResponse.json({ error: "Cannot delete the last admin account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
