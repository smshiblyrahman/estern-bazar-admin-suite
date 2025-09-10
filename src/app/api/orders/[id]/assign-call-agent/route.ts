import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    
    // SUPER_ADMIN only
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied: SUPER_ADMIN only' }, { status: 403 });
    }

    const body = await req.json();
    const { agentId, note } = body;
    const { id: orderId } = await params;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Verify order exists and is in correct status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow assignment for PENDING orders
    if (order.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Cannot assign call agent to order with status: ${order.status}` 
      }, { status: 400 });
    }

    // Verify call agent exists and has correct role
    const callAgent = await prisma.user.findUnique({
      where: { id: agentId },
    });

    if (!callAgent || callAgent.role !== 'CALL_AGENT') {
      return NextResponse.json({ error: 'Invalid call agent' }, { status: 400 });
    }

    if (callAgent.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Call agent is not active' }, { status: 400 });
    }

    // Update order with call agent assignment and change status
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          callAssignedToId: agentId,
          callAssignedById: user.id,
          callAssignedAt: new Date(),
          status: 'CALL_ASSIGNED',
        },
        include: {
          customer: true,
          callAssignedTo: { select: { name: true, email: true } },
          items: {
            include: { product: true },
          },
        },
      });

      // Log status change
      await tx.orderStatusChange.create({
        data: {
          orderId: orderId,
          from: 'PENDING',
          to: 'CALL_ASSIGNED',
          changedById: user.id,
        },
      });

      return updated;
    });

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'ORDER_CALL_ASSIGNED',
      targetType: 'Order',
      targetId: orderId,
      metadata: {
        agentId,
        agentName: callAgent.name,
        orderNumber: order.orderNumber,
        note: note || null,
      },
    });

    return NextResponse.json(updatedOrder);

  } catch (error: any) {
    console.error('Error assigning call agent:', error);
    if (error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
