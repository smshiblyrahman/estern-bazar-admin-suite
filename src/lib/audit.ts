import { prisma } from './prisma';
import { AuditAction } from '@prisma/client';

export async function createAuditLog({
  actorId,
  action,
  targetType,
  targetId,
  metadata = {},
}: {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}
