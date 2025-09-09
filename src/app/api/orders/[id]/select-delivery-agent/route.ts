import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireAuth();
    assertAdminOrSuper(user.role);

    const body = await req.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Verify order exists and is in correct status
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow selection for PACKED orders
    if (order.status !== 'PACKED') {
      return NextResponse.json({ 
        error: `Cannot select delivery agent for order with status: ${order.status}` 
      }, { status: 400 });
    }

    // Verify delivery agent exists and is active
    const deliveryAgent = await prisma.deliveryAgent.findUnique({
      where: { id: agentId },
    });

    if (!deliveryAgent || !deliveryAgent.active) {
      return NextResponse.json({ error: 'Invalid or inactive delivery agent' }, { status: 400 });
    }

    // Update order with selected delivery agent and change status
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order
      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          selectedDeliveryAgentId: agentId,
          status: 'DELIVERY_AGENT_SELECTED',
        },
        include: {
          customer: true,
          selectedDeliveryAgent: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Log status change
      await tx.orderStatusChange.create({
        data: {
          orderId: params.id,
          from: 'PACKED',
          to: 'DELIVERY_AGENT_SELECTED',
          changedById: user.id,
        },
      });

      return updated;
    });

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'ORDER_DELIVERY_SELECTED',
      targetType: 'Order',
      targetId: params.id,
      metadata: {
        agentId,
        agentName: deliveryAgent.name,
        orderNumber: order.orderNumber,
      },
    });

    return NextResponse.json(updatedOrder);

  } catch (error: any) {
    console.error('Error selecting delivery agent:', error);
    if (error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
