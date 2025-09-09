import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper, assertSuper } from '@/lib/rbac';
import { createUserSchema } from '@/lib/validators/user';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcrypt';

export async function GET(req: Request) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);
  
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') as any;
  const status = searchParams.get('status') as any;
  const search = searchParams.get('search');

  const where: any = {};
  
  if (role && role !== 'all') {
    where.role = role;
  }
  
  if (status && status !== 'all') {
    where.status = status;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
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
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);
  const body = await req.json();

  // Validate input
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const { email, name, phone, role, status, tempPassword } = validation.data;

  if (role === 'SUPER_ADMIN') {
    // guard: only one super admin in system
    assertSuper(user.role);
    const existing = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (existing) return NextResponse.json({ error: 'A SUPER_ADMIN already exists' }, { status: 400 });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const created = await prisma.user.create({
    data: {
      email,
      name,
      phone,
      passwordHash,
      role,
      status,
      forcePasswordReset: true, // Force password reset on first login
      adminCreatedById: ['ADMIN','SUPER_ADMIN'].includes(user.role) ? user.id : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'CREATE',
    targetType: 'User',
    targetId: created.id,
    metadata: { role, email, name },
  });

  return NextResponse.json(created, { status: 201 });
}


