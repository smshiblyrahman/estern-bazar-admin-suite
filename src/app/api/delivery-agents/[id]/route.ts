import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateDeliveryAgentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  email: z.string().email('Invalid email').optional(),
  vehicleType: z.enum(['BIKE', 'CAR', 'VAN', 'TRUCK']).optional(),
  vehicleNumber: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const agent = await prisma.deliveryAgent.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        include: {
          customer: {
            select: { name: true, phone: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
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

  if (!agent) {
    return NextResponse.json({ error: 'Delivery agent not found' }, { status: 404 });
  }

  return NextResponse.json(agent);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const body = await request.json();

  // Validate input
  const validation = updateDeliveryAgentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;

  // Check if agent exists
  const existingAgent = await prisma.deliveryAgent.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, phone: true }
  });

  if (!existingAgent) {
    return NextResponse.json({ error: 'Delivery agent not found' }, { status: 404 });
  }

  // Check if phone number is being changed and if it conflicts
  if (data.phone && data.phone !== existingAgent.phone) {
    const phoneConflict = await prisma.deliveryAgent.findUnique({
      where: { phone: data.phone },
      select: { id: true }
    });

    if (phoneConflict && phoneConflict.id !== params.id) {
      return NextResponse.json({ 
        error: 'Phone number already in use by another delivery agent' 
      }, { status: 409 });
    }
  }

  // Update delivery agent
  const updatedAgent = await prisma.deliveryAgent.update({
    where: { id: params.id },
    data,
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
    action: 'UPDATE',
    targetType: 'DeliveryAgent',
    targetId: updatedAgent.id,
    metadata: { 
      changes: data,
      agentName: existingAgent.name,
    },
  });

  return NextResponse.json(updatedAgent);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  // Check if agent exists
  const agent = await prisma.deliveryAgent.findUnique({
    where: { id: params.id },
    select: { 
      id: true, 
      name: true,
      _count: {
        select: {
          orders: {
            where: {
              status: { in: ['CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'] }
            }
          }
        }
      }
    }
  });

  if (!agent) {
    return NextResponse.json({ error: 'Delivery agent not found' }, { status: 404 });
  }

  // Check if agent has active orders
  if (agent._count.orders > 0) {
    return NextResponse.json({ 
      error: 'Cannot delete delivery agent with active orders' 
    }, { status: 400 });
  }

  // Delete delivery agent
  await prisma.deliveryAgent.delete({
    where: { id: params.id }
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'DELETE',
    targetType: 'DeliveryAgent',
    targetId: agent.id,
    metadata: { 
      agentName: agent.name,
    },
  });

  return NextResponse.json({ message: 'Delivery agent deleted successfully' });
}
