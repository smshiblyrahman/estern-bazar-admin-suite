import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { updateOrderSchema } from '@/lib/validators/order';
import { createAuditLog } from '@/lib/audit';
import { isValidStatusTransition } from '@/lib/utils/order-workflow';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
  assertAdminOrSuper(user.role);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true }
      },
      items: {
        include: {
          product: {
            select: { id: true, title: true, slug: true, media: { take: 1 } }
          }
        }
      },
      deliveryAgent: {
        select: { id: true, name: true, phone: true, email: true }
      },
      statusChanges: {
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: {
            select: { name: true, email: true }
          }
        }
      }
    }
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
  assertAdminOrSuper(user.role);

  const body = await request.json();

  // Validate input
  const validation = updateOrderSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;

  // Check if order exists
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true }
  });

  if (!existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Validate status transition if status is being changed
  if (data.status && data.status !== existingOrder.status) {
    if (!isValidStatusTransition(existingOrder.status, data.status)) {
      return NextResponse.json({ 
        error: `Invalid status transition from ${existingOrder.status} to ${data.status}` 
      }, { status: 400 });
    }
  }

  // If assigning delivery agent, verify they exist and are available
  if (data.deliveryAgentId) {
    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: data.deliveryAgentId },
      select: { id: true, name: true, status: true }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Delivery agent not found' }, { status: 404 });
    }

    if (agent.status !== 'AVAILABLE') {
      return NextResponse.json({ 
        error: 'Delivery agent is not available' 
      }, { status: 400 });
    }
  }

  // Update order in transaction
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update the order
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        status: data.status,
        deliveryAgentId: data.deliveryAgentId,
        notes: data.notes,
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
          select: { id: true, name: true, phone: true }
        }
      }
    });

    // Create status change record if status changed
    if (data.status && data.status !== existingOrder.status) {
      await tx.orderStatusChange.create({
        data: {
          orderId: orderId,
          fromStatus: existingOrder.status,
          toStatus: data.status,
          reason: data.statusReason || `Status changed to ${data.status}`,
          changedById: user.id,
        }
      });
    }

    return order;
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'UPDATE',
    targetType: 'Order',
    targetId: updatedOrder.id,
    metadata: { 
      orderNumber: existingOrder.orderNumber,
      changes: data,
      previousStatus: existingOrder.status,
      newStatus: data.status,
    },
  });

  return NextResponse.json(updatedOrder);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
  assertAdminOrSuper(user.role);

  // Check if order exists and can be deleted
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true }
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Only allow deletion of PENDING or CANCELLED orders
  if (!['PENDING', 'CANCELLED'].includes(order.status)) {
    return NextResponse.json({ 
      error: 'Can only delete pending or cancelled orders' 
    }, { status: 400 });
  }

  // Delete order (cascade should handle related records)
  await prisma.order.delete({
    where: { id: orderId }
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'DELETE',
    targetType: 'Order',
    targetId: order.id,
    metadata: { 
      orderNumber: order.orderNumber,
      status: order.status,
    },
  });

  return NextResponse.json({ message: 'Order deleted successfully' });
}
