import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id: userId } = await params;
    const { id: productId } = await params;
    const { id: orderId } = await params;
    assertAdminOrSuper(user.role);

    // Check if media exists and belongs to the product
    const media = await prisma.productMedia.findFirst({
      where: { 
        id: mediaId,
        productId: orderId 
      },
      include: {
        product: {
          select: { title: true }
        }
      }
    });

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Delete the media
    await prisma.productMedia.delete({
      where: { id: mediaId },
    });

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      targetType: 'ProductMedia',
      targetId: mediaId,
      metadata: { 
        productId: orderId,
        productTitle: media.product.title,
        mediaUrl: media.url,
        mediaType: media.type,
      },
    });

    return NextResponse.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting product media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
