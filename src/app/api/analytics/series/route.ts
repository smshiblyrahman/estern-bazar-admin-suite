import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d
  const metric = searchParams.get('metric') || 'orders'; // orders, revenue, customers
  
  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  let groupBy: 'day' | 'week' = 'day';
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      groupBy = 'day';
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      groupBy = 'day';
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      groupBy = 'week';
      break;
    default:
      startDate.setDate(now.getDate() - 30);
      groupBy = 'day';
  }

  try {
    let data: Array<{ date: string; value: number }> = [];

    if (metric === 'orders') {
      // Get orders by day/week
      const orders = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as count
        FROM Order 
        WHERE createdAt >= ${startDate}
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `;

      data = orders.map(item => ({
        date: item.date,
        value: Number(item.count),
      }));

    } else if (metric === 'revenue') {
      // Get revenue by day/week
      const revenue = await prisma.$queryRaw<Array<{ date: string; total: bigint | null }>>`
        SELECT 
          DATE(createdAt) as date,
          SUM(totalCents) as total
        FROM Order 
        WHERE createdAt >= ${startDate} 
          AND status = 'DELIVERED'
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `;

      data = revenue.map(item => ({
        date: item.date,
        value: Number(item.total || 0) / 100, // Convert cents to dollars
      }));

    } else if (metric === 'customers') {
      // Get new customers by day/week
      const customers = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as count
        FROM User 
        WHERE createdAt >= ${startDate} 
          AND role = 'CUSTOMER'
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `;

      data = customers.map(item => ({
        date: item.date,
        value: Number(item.count),
      }));
    }

    // Fill in missing dates with zero values
    const filledData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateString = currentDate.toISOString().split('T')[0];
      const existingData = data.find(item => item.date === dateString);
      
      filledData.push({
        date: dateString,
        value: existingData?.value || 0,
      });

      if (groupBy === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    return NextResponse.json({
      period,
      metric,
      groupBy,
      data: filledData,
    });

  } catch (error) {
    console.error('Error fetching analytics series:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
