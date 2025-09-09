import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createProductSchema } from '@/lib/validators/product';
import { createAuditLog } from '@/lib/audit';
import { generateSlug, ensureUniqueSlug } from '@/lib/utils/slug';

export async function GET(req: Request) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);
  
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as any;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const featured = searchParams.get('featured');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (status && status !== 'all') {
    where.status = status;
  }
  
  if (category && category !== 'all') {
    where.category = category;
  }
  
  if (featured === 'true') {
    where.featured = true;
  }
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { 
        media: {
          orderBy: { position: 'asc' }
        },
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where })
  ]);

  return NextResponse.json({ 
    products, 
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

export async function POST(req: Request) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);
  const body = await req.json();

  // Validate input
  const validation = createProductSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;
  
  // Generate unique slug from title
  const baseSlug = generateSlug(data.title);
  const slug = await ensureUniqueSlug(
    baseSlug, 
    async (slug) => {
      const existing = await prisma.product.findUnique({ where: { slug } });
      return !!existing;
    }
  );

  // Convert price to cents for storage
  const priceCents = Math.round(data.price * 100);
  const comparePriceCents = data.comparePrice ? Math.round(data.comparePrice * 100) : null;

  const created = await prisma.product.create({
    data: {
      title: data.title,
      slug,
      description: data.description || '',
      priceCents,
      comparePriceCents,
      stock: data.stock,
      sku: data.sku,
      category: data.category,
      tags: data.tags,
      status: data.status,
      featured: data.featured,
      weight: data.weight,
      dimensions: data.dimensions,
      createdById: user.id,
    },
    include: {
      media: {
        orderBy: { position: 'asc' }
      },
      createdBy: {
        select: { name: true, email: true }
      }
    }
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'CREATE',
    targetType: 'Product',
    targetId: created.id,
    metadata: { title: data.title, slug, status: data.status },
  });

  return NextResponse.json(created, { status: 201 });
}


