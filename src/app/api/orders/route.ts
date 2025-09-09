import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createOrderSchema } from '@/lib/validators/order';
import { createAuditLog } from '@/lib/audit';
import { generateOrderNumber } from '@/lib/utils/order-workflow';

export async function GET(request: NextRequest) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const phase = searchParams.get('phase');
  const customerId = searchParams.get('customerId');
  const deliveryAgentId = searchParams.get('deliveryAgentId');
  const callAssignedToId = searchParams.get('callAssignedToId');
  const search = searchParams.get('search');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (status && status !== 'all') {
    where.status = status;
  }

  // Phase filtering for UI queues
  if (phase) {
    if (phase === 'call') {
      where.status = { in: ['PENDING', 'CALL_ASSIGNED'] };
    } else if (phase === 'delivery') {
      where.status = { in: ['CALL_CONFIRMED', 'PACKED', 'DELIVERY_AGENT_SELECTED', 'DELIVERY_ASSIGNED', 'OUT_FOR_DELIVERY'] };
    }
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (deliveryAgentId) {
    where.deliveryAgentId = deliveryAgentId;
  }

  if (callAssignedToId) {
    where.callAssignedToId = callAssignedToId;
  }
  
  if (search) {
    where.OR = [
      { orderNumber: { equals: parseInt(search) || 0 } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
      { shippingAddress: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (dateFrom) {
    where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
  }
  
  if (dateTo) {
    where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
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
        callAssignedTo: {
          select: { name: true, email: true }
        },
        callAssignedBy: {
          select: { name: true, email: true }
        },
        selectedDeliveryAgent: {
          select: { id: true, name: true, phone: true }
        },
        deliveryAgent: {
          select: { id: true, name: true, phone: true }
        },
        callAttempts: {
          include: {
            agent: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        },
        statusChanges: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            changedBy: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where })
  ]);

  return NextResponse.json({ 
    orders, 
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

export async function POST(request: NextRequest) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const body = await request.json();

  // Validate input
  const validation = createOrderSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;

  // Verify customer exists
  const customer = await prisma.user.findUnique({
    where: { id: data.customerId },
    select: { id: true, name: true, email: true }
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Verify products exist and calculate totals
  const productIds = data.items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true, priceCents: true, stock: true }
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: 'Some products not found' }, { status: 404 });
  }

  // Check stock availability
  for (const item of data.items) {
    const product = products.find(p => p.id === item.productId);
    if (product && product.stock < item.quantity) {
      return NextResponse.json({ 
        error: `Insufficient stock for product: ${product.title}` 
      }, { status: 400 });
    }
  }

  // Calculate totals
  const subtotalCents = data.items.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
  const shippingCents = 5000; // 50 BDT shipping
  const totalCents = subtotalCents + shippingCents;

  // Generate order number
  const orderNumber = generateOrderNumber();

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerId: data.customerId,
        status: 'PENDING',
        subtotalCents,
        shippingCents,
        totalCents,
        shippingAddress: JSON.stringify(data.shippingAddress),
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            priceCents: item.priceCents,
          }))
        }
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
        }
      }
    });

    // Update product stock
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
    }

    // Create initial status change
    await tx.orderStatusChange.create({
      data: {
        orderId: newOrder.id,
        fromStatus: null,
        toStatus: 'PENDING',
        reason: 'Order created',
        changedById: user.id,
      }
    });

    return newOrder;
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'CREATE',
    targetType: 'Order',
    targetId: order.id,
    metadata: { 
      orderNumber,
      customerId: data.customerId,
      customerName: customer.name,
      totalCents,
      itemCount: data.items.length,
    },
  });

  return NextResponse.json(order, { status: 201 });
}


