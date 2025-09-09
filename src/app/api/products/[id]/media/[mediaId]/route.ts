import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const { user } = await requireAuth();
    assertAdminOrSuper(user.role);

    // Check if media exists and belongs to the product
    const media = await prisma.productMedia.findFirst({
      where: { 
        id: params.mediaId,
        productId: params.id 
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
      where: { id: params.mediaId },
    });

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      targetType: 'ProductMedia',
      targetId: params.mediaId,
      metadata: { 
        productId: params.id,
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
