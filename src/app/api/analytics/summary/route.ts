import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d'; // 1d, 7d, 30d, 90d
  
  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '1d':
      startDate.setDate(now.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  try {
    // Get KPI data in parallel
    const [
      todayOrders,
      totalRevenue,
      inFlightOrders,
      visitorsToday,
      newCustomers,
      totalProducts,
      lowStockProducts,
      totalDeliveryAgents,
      activeDeliveryAgents,
      ordersByStatus,
    ] = await Promise.all([
      // Today's orders
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
      }),

      // Total revenue in the period
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['DELIVERED'] },
        },
        _sum: { totalCents: true },
      }),

      // In-flight orders (not delivered/cancelled/returned)
      prisma.order.count({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'] },
        },
      }),

      // Visitors today (placeholder - would come from VisitEvent table)
      Promise.resolve(0), // We'll implement this when we have visit tracking

      // New customers in the period
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: startDate },
        },
      }),

      // Total products
      prisma.product.count({
        where: { status: { not: 'ARCHIVED' } },
      }),

      // Low stock products (stock < 10)
      prisma.product.count({
        where: {
          stock: { lt: 10 },
          status: 'PUBLISHED',
        },
      }),

      // Total delivery agents
      prisma.deliveryAgent.count(),

      // Active delivery agents
      prisma.deliveryAgent.count({
        where: { status: { in: ['AVAILABLE', 'BUSY'] } },
      }),

      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // Calculate previous period for comparison
    const previousStartDate = new Date(startDate);
    const periodLength = startDate.getTime() - previousStartDate.getTime();
    previousStartDate.setTime(previousStartDate.getTime() - periodLength);

    const [previousRevenue, previousOrders, previousCustomers] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: previousStartDate, lt: startDate },
          status: { in: ['DELIVERED'] },
        },
        _sum: { totalCents: true },
      }),

      prisma.order.count({
        where: {
          createdAt: { gte: previousStartDate, lt: startDate },
        },
      }),

      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: previousStartDate, lt: startDate },
        },
      }),
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentRevenue = totalRevenue._sum.totalCents || 0;
    const prevRevenue = previousRevenue._sum.totalCents || 0;
    const currentOrdersInPeriod = await prisma.order.count({
      where: { createdAt: { gte: startDate } },
    });

    const summary = {
      period,
      kpis: {
        todayOrders: {
          value: todayOrders,
          label: "Today's Orders",
        },
        totalRevenue: {
          value: currentRevenue,
          label: 'Total Revenue',
          change: calculateChange(currentRevenue, prevRevenue),
          formatted: `৳${(currentRevenue / 100).toFixed(2)}`,
        },
        inFlightOrders: {
          value: inFlightOrders,
          label: 'In-Flight Orders',
        },
        visitorsToday: {
          value: visitorsToday,
          label: 'Visitors Today',
        },
        newCustomers: {
          value: newCustomers,
          label: 'New Customers',
          change: calculateChange(newCustomers, previousCustomers),
        },
        totalProducts: {
          value: totalProducts,
          label: 'Active Products',
        },
        lowStockProducts: {
          value: lowStockProducts,
          label: 'Low Stock Alerts',
          status: lowStockProducts > 0 ? 'warning' : 'success',
        },
        deliveryAgents: {
          value: `${activeDeliveryAgents}/${totalDeliveryAgents}`,
          label: 'Active Agents',
        },
        orders: {
          value: currentOrdersInPeriod,
          label: 'Total Orders',
          change: calculateChange(currentOrdersInPeriod, previousOrders),
        },
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
