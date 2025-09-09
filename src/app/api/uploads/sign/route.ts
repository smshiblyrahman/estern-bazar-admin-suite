import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertAdminOrSuper } from '@/lib/rbac';
import { z } from 'zod';

const signUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  size: z.number().min(1, 'File size must be greater than 0'),
});

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    assertAdminOrSuper(user.role);

    const body = await request.json();
    const validation = signUploadSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { filename, contentType, size } = validation.data;

    // Validate file type and size
    const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);

    if (!isImage && !isVideo) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only images and videos are allowed.' 
      }, { status: 400 });
    }

    if (isImage && size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ 
        error: `Image file too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.` 
      }, { status: 400 });
    }

    if (isVideo && size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ 
        error: `Video file too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB.` 
      }, { status: 400 });
    }

    // For local development, we'll create a simple upload endpoint
    // In production, this would generate S3 signed URLs
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `${timestamp}-${randomString}.${fileExtension}`;
    
    // For local development, return a direct upload URL to our server
    const uploadUrl = `/api/uploads/direct`;
    
    return NextResponse.json({
      uploadUrl,
      fields: {
        filename: uniqueFilename,
        contentType,
        originalFilename: filename,
      },
      url: `/uploads/${uniqueFilename}`, // This will be the final URL after upload
    });

  } catch (error) {
    console.error('Error signing upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
