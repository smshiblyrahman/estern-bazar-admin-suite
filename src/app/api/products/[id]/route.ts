import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { updateProductSchema } from '@/lib/validators/product';
import { createAuditLog } from '@/lib/audit';
import { generateSlug, ensureUniqueSlug } from '@/lib/utils/slug';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);
  
  const product = await prisma.product.findUnique({ 
    where: { id: params.id }, 
    include: { 
      media: {
        orderBy: { position: 'asc' }
      },
      createdBy: {
        select: { name: true, email: true }
      }
    } 
  });
  
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  
  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);
  const body = await req.json();

  // Validate input
  const validation = updateProductSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, { status: 400 });
  }

  const data = validation.data;

  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, slug: true }
  });

  if (!existingProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Handle slug update if title changed
  let updateData: any = { ...data };
  
  if (data.title && data.title !== existingProduct.title) {
    const baseSlug = generateSlug(data.title);
    updateData.slug = await ensureUniqueSlug(
      baseSlug,
      async (slug) => {
        const existing = await prisma.product.findUnique({ where: { slug } });
        return existing ? existing.id !== params.id : false;
      },
      params.id
    );
  }

  // Convert prices to cents if provided
  if (data.price !== undefined) {
    updateData.priceCents = Math.round(data.price * 100);
    delete updateData.price;
  }
  
  if (data.comparePrice !== undefined) {
    updateData.comparePriceCents = data.comparePrice ? Math.round(data.comparePrice * 100) : null;
    delete updateData.comparePrice;
  }

  const updated = await prisma.product.update({ 
    where: { id: params.id }, 
    data: updateData,
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
    action: 'UPDATE',
    targetType: 'Product',
    targetId: updated.id,
    metadata: { 
      changes: data,
      title: updated.title,
      slug: updated.slug,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user } = await requireAuth();
  assertAdminOrSuper(user.role);

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, slug: true }
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Delete product and its media (cascade should handle this)
  await prisma.product.delete({ where: { id: params.id } });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: 'DELETE',
    targetType: 'Product',
    targetId: product.id,
    metadata: { 
      title: product.title,
      slug: product.slug,
    },
  });

  return NextResponse.json({ message: 'Product deleted successfully' });
}


