import { NextRequest } from 'next/server';
import { POST as SelectDeliveryAgent } from '@/app/api/orders/[id]/select-delivery-agent/route';
import { POST as AssignDeliveryAgent } from '@/app/api/orders/[id]/assign-delivery-agent/route';
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
    deliveryAgent: {
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

describe('Delivery Agent Assignment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Select vs Assign Rules', () => {
    it('should allow selecting delivery agent when order is PACKED', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PACKED',
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      mockPrisma.deliveryAgent.findUnique.mockResolvedValue({
        id: 'agent-1',
        name: 'Delivery Agent',
        active: true
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/select-delivery-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-1' })
      });

      // Act
      const response = await SelectDeliveryAgent(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          selectedDeliveryAgentId: 'agent-1',
          status: 'DELIVERY_AGENT_SELECTED',
        },
        include: expect.any(Object)
      });
    });

    it('should allow assignment when agentId matches selectedDeliveryAgentId', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED',
        selectedDeliveryAgentId: 'agent-1', // Selected agent
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      mockPrisma.deliveryAgent.findUnique.mockResolvedValue({
        id: 'agent-1',
        name: 'Delivery Agent',
        active: true
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_ASSIGNED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-delivery-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-1' }) // Same as selected
      });

      // Act
      const response = await AssignDeliveryAgent(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          deliveryAgentId: 'agent-1',
          status: 'DELIVERY_ASSIGNED',
        },
        include: expect.any(Object)
      });
    });

    it('should use selectedDeliveryAgentId when agentId is omitted', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED',
        selectedDeliveryAgentId: 'agent-1', // Selected agent
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      mockPrisma.deliveryAgent.findUnique.mockResolvedValue({
        id: 'agent-1',
        name: 'Delivery Agent',
        active: true
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_ASSIGNED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-delivery-agent', {
        method: 'POST',
        body: JSON.stringify({}) // No agentId provided
      });

      // Act
      const response = await AssignDeliveryAgent(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          deliveryAgentId: 'agent-1', // Should use selectedDeliveryAgentId
          status: 'DELIVERY_ASSIGNED',
        },
        include: expect.any(Object)
      });
    });

    it('should deny ADMIN override when agentId differs from selectedDeliveryAgentId', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED',
        selectedDeliveryAgentId: 'agent-1', // Selected agent
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-delivery-agent', {
        method: 'POST',
        body: JSON.stringify({ 
          agentId: 'agent-2', // Different from selected
          override: true,
          reason: 'Agent 1 unavailable'
        })
      });

      // Act
      const response = await AssignDeliveryAgent(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only SUPER_ADMIN can override delivery agent selection');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN override with reason', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'super-admin-1', role: 'SUPER_ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED',
        selectedDeliveryAgentId: 'agent-1', // Selected agent
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      mockPrisma.deliveryAgent.findUnique.mockResolvedValue({
        id: 'agent-2',
        name: 'Different Agent',
        active: true
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_ASSIGNED'
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-delivery-agent', {
        method: 'POST',
        body: JSON.stringify({ 
          agentId: 'agent-2', // Different from selected
          override: true,
          reason: 'Original agent became unavailable'
        })
      });

      // Act
      const response = await AssignDeliveryAgent(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          deliveryAgentId: 'agent-2',
          status: 'DELIVERY_ASSIGNED',
        },
        include: expect.any(Object)
      });
    });

    it('should require override=true and reason for SUPER_ADMIN override', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'super-admin-1', role: 'SUPER_ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED',
        selectedDeliveryAgentId: 'agent-1', // Selected agent
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-delivery-agent', {
        method: 'POST',
        body: JSON.stringify({ 
          agentId: 'agent-2', // Different from selected
          override: false, // Missing override=true
          reason: 'Some reason'
        })
      });

      // Act
      const response = await AssignDeliveryAgent(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Override requires override=true and reason when assigning different agent than selected');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should reject assignment when no agent selected and no agentId provided', async () => {
      // Arrange
      mockRequireAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERY_AGENT_SELECTED',
        selectedDeliveryAgentId: null, // No selected agent
        orderNumber: 1001,
        customer: { name: 'John Doe' }
      });

      const request = new NextRequest('http://localhost/api/orders/order-1/assign-delivery-agent', {
        method: 'POST',
        body: JSON.stringify({}) // No agentId provided
      });

      // Act
      const response = await AssignDeliveryAgent(request, { params: { id: 'order-1' } });

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('No delivery agent specified and no agent selected for this order');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});
