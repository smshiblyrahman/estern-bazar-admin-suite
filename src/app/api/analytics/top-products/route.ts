import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d';
  const limit = parseInt(searchParams.get('limit') || '10');
  
  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
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
    // Get top products by quantity sold
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        priceCents: true,
      },
      _count: {
        productId: true,
      },
      where: {
        order: {
          createdAt: { gte: startDate },
          status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'PACKED', 'CONFIRMED'] },
        },
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    // Get product details
    const productIds = topProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        priceCents: true,
        stock: true,
        media: {
          take: 1,
          orderBy: { position: 'asc' },
        },
      },
    });

    // Combine data
    const result = topProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        product: {
          id: item.productId,
          title: product?.title || 'Unknown Product',
          slug: product?.slug || '',
          priceCents: product?.priceCents || 0,
          stock: product?.stock || 0,
          image: product?.media[0]?.url || null,
        },
        metrics: {
          quantitySold: item._sum.quantity || 0,
          totalRevenue: item._sum.priceCents || 0,
          orderCount: item._count.productId,
        },
      };
    });

    return NextResponse.json({
      period,
      limit,
      products: result,
    });

  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
