import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { logAction } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role, isActive: true },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  await logAction({
    userId: session.user.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    details: `Created user ${user.name} with role ${user.role}`,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(user, { status: 201 });
}
