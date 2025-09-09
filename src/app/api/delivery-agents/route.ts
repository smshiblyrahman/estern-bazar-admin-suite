import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createDeliveryAgentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional(),
  vehicleType: z.enum(['BIKE', 'CAR', 'VAN', 'TRUCK']).optional(),
  vehicleNumber: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).default('AVAILABLE'),
});

const updateDeliveryAgentSchema = createDeliveryAgentSchema.partial();

export async function GET(request: NextRequest) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const availableOnly = searchParams.get('availableOnly') === 'true';

  const where: any = {};
  
  if (status && status !== 'all') {
    where.status = status;
  }
  
  if (availableOnly) {
    where.status = 'AVAILABLE';
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { vehicleNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const agents = await prisma.deliveryAgent.findMany({
    where,
    include: {
      _count: {
        select: {
          orders: true,
          completedOrders: {
            where: { status: 'DELIVERED' }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(agents);
}

export async function POST(request: NextRequest) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const body = await request.json();

  // Validate input
  const validation = createDeliveryAgentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;

  // Check if agent with same phone already exists
  const existingAgent = await prisma.deliveryAgent.findUnique({
    where: { phone: data.phone },
    select: { id: true }
  });

  if (existingAgent) {
    return NextResponse.json({ 
      error: 'Delivery agent with this phone number already exists' 
    }, { status: 409 });
  }

  // Create delivery agent
  const agent = await prisma.deliveryAgent.create({
    data: {
      ...data,
      createdById: user.id,
    },
    include: {
      _count: {
        select: {
          orders: true,
          completedOrders: {
            where: { status: 'DELIVERED' }
          }
        }
      }
    }
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'CREATE',
    targetType: 'DeliveryAgent',
    targetId: agent.id,
    metadata: { 
      name: data.name,
      phone: data.phone,
      vehicleType: data.vehicleType,
    },
  });

  return NextResponse.json(agent, { status: 201 });
}
