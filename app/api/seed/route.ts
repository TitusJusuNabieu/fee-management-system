import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

// One-time seed endpoint — only works when no users exist
export async function POST() {
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json(
      { error: "System already initialized" },
      { status: 400 }
    );
  }

  const password = await hash("Admin@1234", 12);

  const admin = await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "admin@enc.edu.sl",
      password,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  return NextResponse.json({
    message: "Admin account created successfully",
    email: admin.email,
    defaultPassword: "Admin@1234",
    note: "Please change the password immediately after first login.",
  });
}
