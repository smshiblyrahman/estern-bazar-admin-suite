import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { resetPasswordSchema } from '@/lib/validators/user';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcrypt';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
  assertAdminOrSuper(user.role);
  
  const body = await req.json();
  
  // Validate input
  const validation = resetPasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: orderId },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent modifying SUPER_ADMIN password unless you are SUPER_ADMIN
  if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Cannot reset SUPER_ADMIN password' }, { status: 403 });
  }

  const { tempPassword } = validation.data;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: orderId },
    data: {
      passwordHash,
      forcePasswordReset: true, // Force password change on next login
    },
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'RESET_PASSWORD',
    targetType: 'User',
    targetId: targetUser.id,
    metadata: { 
      targetEmail: targetUser.email,
      targetName: targetUser.name,
    },
  });

  return NextResponse.json({ 
    message: 'Password reset successfully. User will be required to change password on next login.' 
  });
}
