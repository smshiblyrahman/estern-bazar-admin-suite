import { NextRequest } from 'next/server';
import { POST } from '@/app/api/orders/[id]/assign-call-agent/route';
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
    user: {
      findUnique: jest.fn(),
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

describe('Call Agent Assignment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization Rules', () => {
    it('should allow SUPER_ADMIN to assign call agent', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'super-admin-id', role: 'SUPER_ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'agent-1',
        role: 'CALL_AGENT',
        status: 'ACTIVE',
        name: 'Call Agent'
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-call-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-1', note: 'Test assignment' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          callAssignedToId: 'agent-1',
          callAssignedById: 'super-admin-id',
          callAssignedAt: expect.any(Date),
          status: 'CALL_ASSIGNED',
        },
        include: expect.any(Object)
      });
    });

    it('should deny ADMIN access (403 Forbidden)', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-id', role: 'ADMIN' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-call-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-1' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Access denied: SUPER_ADMIN only');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should deny CALL_AGENT access (403 Forbidden)', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'call-agent-id', role: 'CALL_AGENT' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-call-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-1' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Access denied: SUPER_ADMIN only');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should reject assignment to non-CALL_AGENT user', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'super-admin-id', role: 'SUPER_ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN', // Not CALL_AGENT
        status: 'ACTIVE',
        name: 'Admin User'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-call-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'admin-1' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid call agent');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should reject assignment to inactive call agent', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'super-admin-id', role: 'SUPER_ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'agent-1',
        role: 'CALL_AGENT',
        status: 'INACTIVE', // Not active
        name: 'Inactive Agent'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-call-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-1' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Call agent is not active');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should reject assignment to non-PENDING order', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'super-admin-id', role: 'SUPER_ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED', // Not PENDING
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-call-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-1' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Cannot assign call agent to order with status: CALL_ASSIGNED');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});
