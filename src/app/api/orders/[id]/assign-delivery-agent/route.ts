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
    const { agentId, override, reason } = body;

    // If agentId is omitted, we'll use the selectedDeliveryAgentId from the order

    // Verify order exists and is in correct status
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { 
        customer: true,
        selectedDeliveryAgent: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow assignment for DELIVERY_AGENT_SELECTED orders
    if (order.status !== 'DELIVERY_AGENT_SELECTED') {
      return NextResponse.json({ 
        error: `Cannot assign delivery agent for order with status: ${order.status}` 
      }, { status: 400 });
    }

    // Determine the actual agent ID to use
    const finalAgentId = agentId || order.selectedDeliveryAgentId;
    
    if (!finalAgentId) {
      return NextResponse.json({ 
        error: 'No delivery agent specified and no agent selected for this order' 
      }, { status: 400 });
    }

    // Verify delivery agent exists and is active
    const deliveryAgent = await prisma.deliveryAgent.findUnique({
      where: { id: finalAgentId },
    });

    if (!deliveryAgent || !deliveryAgent.active) {
      return NextResponse.json({ error: 'Invalid or inactive delivery agent' }, { status: 400 });
    }

    // Check if assignment differs from selection
    const isOverride = agentId && agentId !== order.selectedDeliveryAgentId;
    
    if (isOverride) {
      // Override requires SUPER_ADMIN with override=true and reason
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ 
          error: 'Only SUPER_ADMIN can override delivery agent selection' 
        }, { status: 403 });
      }
      
      if (!override || !reason) {
        return NextResponse.json({ 
          error: 'Override requires override=true and reason when assigning different agent than selected' 
        }, { status: 400 });
      }
    }

    // Update order with assigned delivery agent and change status
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order
      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          deliveryAgentId: finalAgentId,
          status: 'DELIVERY_ASSIGNED',
        },
        include: {
          customer: true,
          selectedDeliveryAgent: true,
          deliveryAgent: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Log status change
      await tx.orderStatusChange.create({
        data: {
          orderId: params.id,
          from: 'DELIVERY_AGENT_SELECTED',
          to: 'DELIVERY_ASSIGNED',
          changedById: user.id,
        },
      });

      return updated;
    });

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'ORDER_DELIVERY_ASSIGNED',
      targetType: 'Order',
      targetId: params.id,
      metadata: {
        agentId: finalAgentId,
        agentName: deliveryAgent.name,
        orderNumber: order.orderNumber,
        isOverride,
        overrideReason: isOverride ? reason : null,
        selectedAgentId: order.selectedDeliveryAgentId,
      },
    });

    return NextResponse.json(updatedOrder);

  } catch (error: any) {
    console.error('Error assigning delivery agent:', error);
    if (error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
