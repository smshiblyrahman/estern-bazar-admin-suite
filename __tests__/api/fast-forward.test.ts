import { NextRequest } from 'next/server';
import { POST } from '@/app/api/orders/[id]/fast-forward/route';
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

describe('Fast-Forward API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Call Phase Fast-Forward Rules', () => {
    it('should block fast-forward from PENDING when no call agent assigned', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        orderNumber: 1001,
        callAssignedToId: null, // No call agent assigned
        selectedDeliveryAgentId: null,
        deliveryAgentId: null
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Fast forward test' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Cannot fast-forward from PENDING: call agent must be assigned first');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should allow fast-forward from PENDING when call agent is assigned', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        orderNumber: 1001,
        callAssignedToId: 'agent-1', // Call agent assigned
        selectedDeliveryAgentId: null,
        deliveryAgentId: null
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Fast forward test' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CALL_ASSIGNED' },
        include: expect.any(Object)
      });
    });

    it('should block fast-forward from CALL_ASSIGNED when no CONFIRMED call attempt', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED',
        orderNumber: 1001,
        callAssignedToId: 'agent-1',
        selectedDeliveryAgentId: null,
        deliveryAgentId: null
      });

      // No CONFIRMED call attempt found
      mockPrisma.callAttempt.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Fast forward test' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Cannot fast-forward from CALL_ASSIGNED: customer confirmation required');
      expect(mockPrisma.callAttempt.findFirst).toHaveBeenCalledWith({
        where: {
          orderId: 'order-1',
          outcome: 'CONFIRMED'
        }
      });
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should allow fast-forward from CALL_ASSIGNED when CONFIRMED call attempt exists', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_ASSIGNED',
        orderNumber: 1001,
        callAssignedToId: 'agent-1',
        selectedDeliveryAgentId: null,
        deliveryAgentId: null
      });

      // CONFIRMED call attempt found
      mockPrisma.callAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        outcome: 'CONFIRMED',
        createdAt: new Date()
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_CONFIRMED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Fast forward test' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CALL_CONFIRMED' },
        include: expect.any(Object)
      });
    });

    it('should block fast-forward from PACKED when no delivery agent selected', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PACKED',
        orderNumber: 1001,
        callAssignedToId: 'agent-1',
        selectedDeliveryAgentId: null, // No delivery agent selected
        deliveryAgentId: null
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Fast forward test' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Cannot fast-forward from PACKED: delivery agent must be selected first');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should block fast-forward from DELIVERY_AGENT_SELECTED when no delivery agent assigned', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED',
        orderNumber: 1001,
        callAssignedToId: 'agent-1',
        selectedDeliveryAgentId: 'delivery-1',
        deliveryAgentId: null // No delivery agent assigned
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Fast forward test' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Cannot fast-forward from DELIVERY_AGENT_SELECTED: delivery agent must be assigned first');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should allow fast-forward from DELIVERY_ASSIGNED when delivery agent is assigned', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_ASSIGNED',
        orderNumber: 1001,
        callAssignedToId: 'agent-1',
        selectedDeliveryAgentId: 'delivery-1',
        deliveryAgentId: 'delivery-1' // Delivery agent assigned
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'OUT_FOR_DELIVERY'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Fast forward test' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'OUT_FOR_DELIVERY' },
        include: expect.any(Object)
      });
    });

    it('should create proper status change record', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CALL_CONFIRMED',
        orderNumber: 1001,
        callAssignedToId: 'agent-1',
        selectedDeliveryAgentId: null,
        deliveryAgentId: null
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'PACKED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/fast-forward', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Ready for packing' })
      });

      // Act
      const response = await POST(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.orderStatusChange.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          from: 'CALL_CONFIRMED',
          to: 'PACKED',
          changedById: 'admin-1',
        }
      });
    });
  });
});
