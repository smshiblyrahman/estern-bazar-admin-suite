import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper, assertSuper } from '@/lib/rbac';
import { updateUserSchema, resetPasswordSchema } from '@/lib/validators/user';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcrypt';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      forcePasswordReset: true,
      createdAt: true,
      updatedAt: true,
      adminCreatedById: true,
      _count: {
        select: {
          products: true,
          orders: true,
        },
      },
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(targetUser);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);
  
  const body = await req.json();
  
  // Validate input
  const validation = updateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent modifying SUPER_ADMIN unless you are SUPER_ADMIN
  if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Cannot modify SUPER_ADMIN' }, { status: 403 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: params.id },
    data: validation.data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      forcePasswordReset: true,
      updatedAt: true,
    },
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'UPDATE',
    targetType: 'User',
    targetId: updatedUser.id,
    metadata: { 
      changes: validation.data,
      targetEmail: targetUser.email,
      targetName: targetUser.name,
    },
  });

  return NextResponse.json(updatedUser);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user } = await requireAuth();
  assertSuper(user.role); // Only SUPER_ADMIN can delete users

  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent deleting SUPER_ADMIN
  if (targetUser.role === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Cannot delete SUPER_ADMIN' }, { status: 403 });
  }

  // Prevent self-deletion
  if (targetUser.id === user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 403 });
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'DELETE',
    targetType: 'User',
    targetId: targetUser.id,
    metadata: { 
      targetEmail: targetUser.email,
      targetName: targetUser.name,
      targetRole: targetUser.role,
    },
  });

  return NextResponse.json({ message: 'User deleted successfully' });
}
