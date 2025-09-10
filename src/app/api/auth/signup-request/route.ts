import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const signupRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  role: z.enum(['CUSTOMER', 'ADMIN', 'CALL_AGENT']),
  reason: z.string().min(10, 'Please provide a detailed reason for access')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validation = signupRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors
      }, { status: 400 });
    }

    const { name, email, phone, role, reason } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({
        error: 'An account with this email already exists. Please sign in instead.'
      }, { status: 409 });
    }

    // Check if there's already a pending signup request for this email
    const existingRequest = await prisma.signupRequest.findUnique({
      where: { email }
    });

    if (existingRequest) {
      return NextResponse.json({
        error: 'A signup request with this email is already pending review.'
      }, { status: 409 });
    }

    // Create signup request
    const signupRequest = await prisma.signupRequest.create({
      data: {
        name,
        email,
        phone,
        requestedRole: role,
        reason,
        status: 'PENDING'
      }
    });

    // Create audit log
    await createAuditLog({
      actorId: 'system', // System-generated request
      action: 'SIGNUP_REQUEST',
      targetType: 'SignupRequest',
      targetId: signupRequest.id,
      metadata: {
        email,
        requestedRole: role,
        name
      }
    });

    return NextResponse.json({
      message: 'Signup request submitted successfully',
      id: signupRequest.id
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating signup request:', error);
    return NextResponse.json({
      error: 'Failed to submit signup request. Please try again.'
    }, { status: 500 });
  }
}
