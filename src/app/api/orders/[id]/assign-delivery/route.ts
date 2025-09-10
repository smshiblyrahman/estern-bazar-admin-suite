import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { assignDeliveryAgentSchema } from '@/lib/validators/order';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireAuth();
    const { id: orderId } = await params;
  assertAdminOrSuper(user.role);

  const body = await request.json();

  // Validate input
  const validation = assignDeliveryAgentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;

  // Check if order exists
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { 
      id: true, 
      status: true, 
      orderNumber: true,
      deliveryAgentId: true,
    }
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Check if order can have delivery agent assigned
  if (!['PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
    return NextResponse.json({ 
      error: 'Cannot assign delivery agent to orders with this status' 
    }, { status: 400 });
  }

  // Check if delivery agent exists and is available
  const agent = await prisma.deliveryAgent.findUnique({
    where: { id: data.deliveryAgentId },
    select: { 
      id: true, 
      name: true, 
      phone: true, 
      email: true,
      status: true,
    }
  });

  if (!agent) {
    return NextResponse.json({ error: 'Delivery agent not found' }, { status: 404 });
  }

  if (agent.status !== 'AVAILABLE') {
    return NextResponse.json({ 
      error: 'Delivery agent is not available' 
    }, { status: 400 });
  }

  // Update order in transaction
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update the order
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { 
        deliveryAgentId: data.deliveryAgentId,
        estimatedDeliveryDate: data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : null,
        notes: data.notes ? `${order.status === 'PENDING' ? '' : order.status + ': '}${data.notes}` : undefined,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, media: { take: 1 } }
            }
          }
        },
        deliveryAgent: {
          select: { id: true, name: true, phone: true, email: true }
        }
      }
    });

    // Create status change record
    await tx.orderStatusChange.create({
      data: {
        orderId: orderId,
        fromStatus: order.status,
        toStatus: order.status, // Status doesn't change, just assignment
        reason: `Delivery agent assigned: ${agent.name}${data.notes ? ` - ${data.notes}` : ''}`,
        changedById: user.id,
      }
    });

    // Update delivery agent status if they were available
    if (agent.status === 'AVAILABLE') {
      await tx.deliveryAgent.update({
        where: { id: data.deliveryAgentId },
        data: { status: 'BUSY' }
      });
    }

    return updated;
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'ASSIGN_DELIVERY',
    targetType: 'Order',
    targetId: updatedOrder.id,
    metadata: { 
      orderNumber: order.orderNumber,
      deliveryAgentId: data.deliveryAgentId,
      deliveryAgentName: agent.name,
      estimatedDeliveryDate: data.estimatedDeliveryDate,
      notes: data.notes,
    },
  });

  return NextResponse.json({
    order: updatedOrder,
    message: `Delivery agent ${agent.name} assigned to order #${order.orderNumber}`
  });
}
