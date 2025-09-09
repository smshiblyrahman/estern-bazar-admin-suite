import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertCallAgent } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createCallAttemptSchema = z.object({
  orderId: z.string(),
  outcome: z.enum(['CONFIRMED', 'UNREACHABLE', 'CUSTOMER_CANCELLED', 'WRONG_NUMBER']),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    assertCallAgent(user.role);

    const body = await req.json();
    const validation = createCallAttemptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 });
    }

    const data = validation.data;

    // Verify order exists and is assigned to this call agent
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If user is CALL_AGENT, they can only access orders assigned to them
    if (user.role === 'CALL_AGENT' && order.callAssignedToId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create call attempt and potentially update order status
    const result = await prisma.$transaction(async (tx) => {
      // Create call attempt
      const callAttempt = await tx.callAttempt.create({
        data: {
          orderId: data.orderId,
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
      
      switch (data.outcome) {
        case 'CONFIRMED':
          newOrderStatus = 'CALL_CONFIRMED';
          callNotes = data.notes || 'Customer confirmed the order';
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
          updateData.callConfirmedAt = new Date();
          updateData.callNotes = callNotes;
        }

        await tx.order.update({
          where: { id: data.orderId },
          data: updateData,
        });

        // Log status change
        await tx.orderStatusChange.create({
          data: {
            orderId: data.orderId,
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
      action: 'CREATE_CALL_ATTEMPT',
      targetType: 'Order',
      targetId: data.orderId,
      metadata: {
        outcome: data.outcome,
        orderNumber: order.orderNumber,
      },
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Error creating call log:', error);
    if (error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    assertCallAgent(user.role);

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (orderId) {
      where.orderId = orderId;
    }

    // If user is CALL_AGENT, only show their attempts
    if (user.role === 'CALL_AGENT') {
      where.agentId = user.id;
    }

    const [callAttempts, total] = await Promise.all([
      prisma.callAttempt.findMany({
        where,
        include: {
          order: {
            include: { customer: { select: { name: true, email: true, phone: true } } },
          },
          agent: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.callAttempt.count({ where }),
    ]);

    return NextResponse.json({
      callAttempts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Error fetching call logs:', error);
    if (error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
