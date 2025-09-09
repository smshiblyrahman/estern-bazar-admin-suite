import { NextRequest } from 'next/server';
import { POST } from '@/app/api/orders/[id]/call-attempt/route';
import { requireAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/rbac');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    callAttempt: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    orderStatusChange: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/audit');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockPrisma = prisma as any;

describe('Call Confirmation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Call Confirmation Rules', () => {
    it('should advance to CALL_CONFIRMED when outcome is CONFIRMED', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'agent-1', role: 'CALL_AGENT' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED',
        callAssignedToId: 'agent-1',
        orderNumber: 1001,
        customer: { name: 'John Doe' },
        callAssignedTo: { name: 'Agent', email: 'agent@test.com' }
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.callAttempt.create.mockResolvedValue({
        id: 'attempt-1',
        outcome: 'CONFIRMED',
        notes: 'Customer confirmed',
        order: { customer: { name: 'John Doe' } },
        agent: { name: 'Agent' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/call-attempt', {
        method: 'POST',
        body: JSON.stringify({ 
          outcome: 'CONFIRMED', 
          notes: 'Customer confirmed the order' 
        })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(201);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: 'CALL_CONFIRMED',
          callConfirmedAt: expect.any(Date),
          callNotes: 'Customer confirmed the order'
        }
      });
      expect(mockPrisma.orderStatusChange.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          from: 'CALL_ASSIGNED',
          to: 'CALL_CONFIRMED',
          changedById: 'agent-1'
        }
      });
    });

    it('should advance to CANCELLED when outcome is CUSTOMER_CANCELLED', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'agent-1', role: 'CALL_AGENT' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED',
        callAssignedToId: 'agent-1',
        orderNumber: 1001,
        customer: { name: 'John Doe' },
        callAssignedTo: { name: 'Agent', email: 'agent@test.com' }
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.callAttempt.create.mockResolvedValue({
        id: 'attempt-1',
        outcome: 'CUSTOMER_CANCELLED',
        notes: 'Customer no longer wants the order',
        order: { customer: { name: 'John Doe' } },
        agent: { name: 'Agent' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/call-attempt', {
        method: 'POST',
        body: JSON.stringify({ 
          outcome: 'CUSTOMER_CANCELLED', 
          notes: 'Customer no longer wants the order' 
        })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(201);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: 'CANCELLED',
          callNotes: 'Customer no longer wants the order'
        }
      });
      expect(mockPrisma.orderStatusChange.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          from: 'CALL_ASSIGNED',
          to: 'CANCELLED',
          changedById: 'agent-1'
        }
      });
    });

    it('should remain CALL_ASSIGNED when outcome is UNREACHABLE', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'agent-1', role: 'CALL_AGENT' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED',
        callAssignedToId: 'agent-1',
        orderNumber: 1001,
        customer: { name: 'John Doe' },
        callAssignedTo: { name: 'Agent', email: 'agent@test.com' }
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.callAttempt.create.mockResolvedValue({
        id: 'attempt-1',
        outcome: 'UNREACHABLE',
        notes: 'Phone rang but no answer',
        order: { customer: { name: 'John Doe' } },
        agent: { name: 'Agent' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/call-attempt', {
        method: 'POST',
        body: JSON.stringify({ 
          outcome: 'UNREACHABLE', 
          notes: 'Phone rang but no answer' 
        })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(201);
      // Order status should NOT be updated for UNREACHABLE
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockPrisma.orderStatusChange.create).not.toHaveBeenCalled();
      // But call attempt should still be logged
      expect(mockPrisma.callAttempt.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          agentId: 'agent-1',
          outcome: 'UNREACHABLE',
          notes: 'Phone rang but no answer'
        },
        include: expect.any(Object)
      });
    });

    it('should deny access to CALL_AGENT not assigned to order', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'other-agent', role: 'CALL_AGENT' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED',
        callAssignedToId: 'agent-1', // Different agent assigned
        orderNumber: 1001,
        customer: { name: 'John Doe' },
        callAssignedTo: { name: 'Agent', email: 'agent@test.com' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/call-attempt', {
        method: 'POST',
        body: JSON.stringify({ outcome: 'CONFIRMED' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Access denied');
      expect(mockPrisma.callAttempt.create).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN to log attempt on any order', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'super-admin', role: 'SUPER_ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED',
        callAssignedToId: 'agent-1',
        orderNumber: 1001,
        customer: { name: 'John Doe' },
        callAssignedTo: { name: 'Agent', email: 'agent@test.com' }
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.callAttempt.create.mockResolvedValue({
        id: 'attempt-1',
        outcome: 'CONFIRMED',
        notes: 'Confirmed by super admin',
        order: { customer: { name: 'John Doe' } },
        agent: { name: 'Super Admin' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/call-attempt', {
        method: 'POST',
        body: JSON.stringify({ 
          outcome: 'CONFIRMED', 
          notes: 'Confirmed by super admin' 
        })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(201);
      expect(mockPrisma.callAttempt.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          agentId: 'super-admin',
          outcome: 'CONFIRMED',
          notes: 'Confirmed by super admin'
        },
        include: expect.any(Object)
      });
    });
  });
});
