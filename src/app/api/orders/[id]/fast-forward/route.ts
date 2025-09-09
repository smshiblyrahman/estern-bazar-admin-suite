import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { fastForwardOrderSchema } from '@/lib/validators/order';
import { createAuditLog } from '@/lib/audit';
import { getNextLogicalStatus, isValidStatusTransition } from '@/lib/utils/order-workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const body = await request.json();

  // Validate input
  const validation = fastForwardOrderSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;

  // Get current order status
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: { 
      id: true, 
      status: true, 
      orderNumber: true,
      deliveryAgentId: true,
      callAssignedToId: true,
      selectedDeliveryAgentId: true,
    }
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Get next logical status
  const nextStatus = getNextLogicalStatus(order.status);
  
  if (!nextStatus) {
    return NextResponse.json({ 
      error: 'Order cannot be advanced further' 
    }, { status: 400 });
  }

  // Validate the transition
  if (!isValidStatusTransition(order.status, nextStatus)) {
    return NextResponse.json({ 
      error: `Invalid status transition from ${order.status} to ${nextStatus}` 
    }, { status: 400 });
  }

  // Enhanced fast-forward validation rules
  if (order.status === 'PENDING') {
    // From PENDING: requires call assignment first
    if (!order.callAssignedToId) {
      return NextResponse.json({ 
        error: 'Cannot fast-forward from PENDING: call agent must be assigned first' 
      }, { status: 400 });
    }
  } else if (order.status === 'CALL_ASSIGNED') {
    // From CALL_ASSIGNED: only proceed if there's a CONFIRMED call attempt
    const confirmedAttempt = await prisma.callAttempt.findFirst({
      where: {
        orderId: params.id,
        outcome: 'CONFIRMED'
      }
    });
    
    if (!confirmedAttempt) {
      return NextResponse.json({ 
        error: 'Cannot fast-forward from CALL_ASSIGNED: customer confirmation required' 
      }, { status: 400 });
    }
  } else if (order.status === 'PACKED') {
    // From PACKED: requires delivery agent selection first
    if (!order.selectedDeliveryAgentId) {
      return NextResponse.json({ 
        error: 'Cannot fast-forward from PACKED: delivery agent must be selected first' 
      }, { status: 400 });
    }
  } else if (order.status === 'DELIVERY_AGENT_SELECTED') {
    // From DELIVERY_AGENT_SELECTED: requires delivery agent assignment
    if (!order.deliveryAgentId) {
      return NextResponse.json({ 
        error: 'Cannot fast-forward from DELIVERY_AGENT_SELECTED: delivery agent must be assigned first' 
      }, { status: 400 });
    }
  }

  // Check if order needs delivery agent for certain statuses
  if (['DELIVERY_ASSIGNED', 'OUT_FOR_DELIVERY'].includes(nextStatus) && !order.deliveryAgentId) {
    return NextResponse.json({ 
      error: 'Order must have a delivery agent assigned before advancing to this status' 
    }, { status: 400 });
  }

  // Update order status in transaction
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update the order
    const updated = await tx.order.update({
      where: { id: params.id },
      data: { status: nextStatus },
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
          select: { id: true, name: true, phone: true }
        }
      }
    });

    // Create status change record
    await tx.orderStatusChange.create({
      data: {
        orderId: params.id,
        from: order.status,
        to: nextStatus,
        changedById: user.id,
      }
    });

    return updated;
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'FAST_FORWARD',
    targetType: 'Order',
    targetId: updatedOrder.id,
    metadata: { 
      orderNumber: order.orderNumber,
      fromStatus: order.status,
      toStatus: nextStatus,
      reason: data.reason,
    },
  });

  return NextResponse.json({
    order: updatedOrder,
    message: `Order fast-forwarded from ${order.status} to ${nextStatus}`
  });
}
