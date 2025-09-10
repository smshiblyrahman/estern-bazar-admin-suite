import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertCallAgent } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createCallAttemptSchema = z.object({
  outcome: z.enum(['CONFIRMED', 'UNREACHABLE', 'CUSTOMER_CANCELLED', 'WRONG_NUMBER']),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
    
    const body = await req.json();
    const validation = createCallAttemptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 });
    }

    const data = validation.data;

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        customer: true,
        callAssignedTo: { select: { name: true, email: true } }
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization checks
    let canAccess = false;
    
    if (user.role === 'SUPER_ADMIN') {
      canAccess = true;
    } else if (user.role === 'ADMIN') {
      // ADMIN can access if order is visible to them (general admin access)
      canAccess = true;
    } else if (user.role === 'CALL_AGENT') {
      // CALL_AGENT can only access orders assigned to them
      canAccess = order.callAssignedToId === user.id;
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create call attempt and potentially update order status
    const result = await prisma.$transaction(async (tx) => {
      // Create call attempt
      const callAttempt = await tx.callAttempt.create({
        data: {
          orderId: orderId,
          agentId: user.id,
          outcome: data.outcome,
          notes: data.notes,
        },
        include: {
          order: {
            include: { customer: true },
          },
          agent: {
            select: { name: true, email: true },
          },
        },
      });

      // Update order status based on call outcome
      let newOrderStatus: string | null = null;
      let callNotes: string | null = null;
      let callConfirmedAt: Date | null = null;
      
      switch (data.outcome) {
        case 'CONFIRMED':
          newOrderStatus = 'CALL_CONFIRMED';
          callNotes = data.notes || 'Customer confirmed the order';
          callConfirmedAt = new Date();
          break;
        case 'CUSTOMER_CANCELLED':
          newOrderStatus = 'CANCELLED';
          callNotes = data.notes || 'Customer cancelled the order';
          break;
        case 'UNREACHABLE':
        case 'WRONG_NUMBER':
          // Keep as CALL_ASSIGNED for retry - admin can decide next action
          break;
      }

      if (newOrderStatus && newOrderStatus !== order.status) {
        const updateData: any = { status: newOrderStatus as any };
        
        if (newOrderStatus === 'CALL_CONFIRMED') {
          updateData.callConfirmedAt = callConfirmedAt;
          updateData.callNotes = callNotes;
        }

        await tx.order.update({
          where: { id: orderId },
          data: updateData,
        });

        // Log status change
        await tx.orderStatusChange.create({
          data: {
            orderId: orderId,
            from: order.status,
            to: newOrderStatus as any,
            changedById: user.id,
          },
        });
      }

      return callAttempt;
    });

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'ORDER_CALL_ATTEMPT',
      targetType: 'Order',
      targetId: orderId,
      metadata: {
        outcome: data.outcome,
        notes: data.notes,
        orderNumber: order.orderNumber,
        statusChanged: result.outcome === 'CONFIRMED' || result.outcome === 'CUSTOMER_CANCELLED',
      },
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Error creating call attempt:', error);
    if (error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
