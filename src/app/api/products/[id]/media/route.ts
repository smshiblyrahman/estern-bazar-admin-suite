import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { productMediaSchema } from '@/lib/validators/product';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
    assertAdminOrSuper(user.role);

    const media = await prisma.productMedia.findMany({
      where: { productId: orderId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error fetching product media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
    assertAdminOrSuper(user.role);

    const body = await request.json();
    const validation = productMediaSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: orderId },
      select: { id: true, title: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data = validation.data;

    // If no position specified, add to end
    if (data.position === 0) {
      const lastMedia = await prisma.productMedia.findFirst({
        where: { productId: orderId },
        orderBy: { position: 'desc' },
        select: { position: true }
      });
      data.position = (lastMedia?.position || 0) + 1;
    }

    const media = await prisma.productMedia.create({
      data: {
        ...data,
        productId: orderId,
      },
    });

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      targetType: 'ProductMedia',
      targetId: media.id,
      metadata: { 
        productId: orderId,
        productTitle: product.title,
        mediaUrl: data.url,
        mediaType: data.type,
      },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error('Error creating product media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
    assertAdminOrSuper(user.role);

    const body = await request.json();
    const { mediaUpdates } = body; // Array of { id, position, altText }

    if (!Array.isArray(mediaUpdates)) {
      return NextResponse.json({ error: 'mediaUpdates must be an array' }, { status: 400 });
    }

    // Update media positions and alt text in a transaction
    const updatedMedia = await prisma.$transaction(
      mediaUpdates.map(update => 
        prisma.productMedia.update({
          where: { id: update.id, productId: orderId },
          data: {
            position: update.position,
            altText: update.altText,
          },
        })
      )
    );

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      targetType: 'ProductMedia',
      targetId: orderId,
      metadata: { 
        productId: orderId,
        updatedCount: mediaUpdates.length,
      },
    });

    return NextResponse.json({ media: updatedMedia });
  } catch (error) {
    console.error('Error updating product media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
