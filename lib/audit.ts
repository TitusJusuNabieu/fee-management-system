import { prisma } from "./prisma";

export async function logAction({
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId, details, ipAddress },
    });
  } catch {
    // Audit logging failure should never break the main flow
  }
}
