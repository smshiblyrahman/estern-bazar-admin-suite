import { OrderStatus } from '@prisma/client';

/**
 * Order status workflow definitions
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CALL_ASSIGNED', 'CANCELLED'],
  CALL_ASSIGNED: ['CALL_CONFIRMED', 'CANCELLED'],
  CALL_CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['DELIVERY_AGENT_SELECTED', 'CANCELLED'],
  DELIVERY_AGENT_SELECTED: ['DELIVERY_ASSIGNED', 'CANCELLED'],
  DELIVERY_ASSIGNED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'], // Can only return after delivery
  CANCELLED: [], // Terminal state
  RETURNED: [], // Terminal state
};

/**
 * Get the next possible statuses for an order
 */
export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_FLOW[currentStatus] || [];
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: OrderStatus, 
  to: OrderStatus
): boolean {
  const allowedTransitions = ORDER_STATUS_FLOW[from] || [];
  return allowedTransitions.includes(to);
}

/**
 * Get the next logical status in the workflow (for fast-forward)
 */
export function getNextLogicalStatus(currentStatus: OrderStatus): OrderStatus | null {
  const nextStatuses = getNextStatuses(currentStatus);
  
  // Return the primary "forward" progression
  switch (currentStatus) {
    case 'PENDING':
      return 'CALL_ASSIGNED'; // First assign to call agent
    case 'CALL_ASSIGNED':
      return 'CALL_CONFIRMED'; // Only after confirmed call attempt
    case 'CALL_CONFIRMED':
      return 'PACKED';
    case 'PACKED':
      return 'DELIVERY_AGENT_SELECTED';
    case 'DELIVERY_AGENT_SELECTED':
      return 'DELIVERY_ASSIGNED';
    case 'DELIVERY_ASSIGNED':
      return 'OUT_FOR_DELIVERY';
    case 'OUT_FOR_DELIVERY':
      return 'DELIVERED';
    default:
      return nextStatuses[0] || null;
  }
}

/**
 * Check if an order can be cancelled
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return ['PENDING', 'CALL_ASSIGNED', 'CALL_CONFIRMED', 'PACKED', 'DELIVERY_AGENT_SELECTED', 'DELIVERY_ASSIGNED'].includes(status);
}

/**
 * Check if an order can be returned
 */
export function canReturnOrder(status: OrderStatus): boolean {
  return status === 'DELIVERED';
}

/**
 * Check if an order requires a delivery agent
 */
export function requiresDeliveryAgent(status: OrderStatus): boolean {
  return ['DELIVERY_AGENT_SELECTED', 'DELIVERY_ASSIGNED', 'OUT_FOR_DELIVERY'].includes(status);
}

/**
 * Check if an order requires call agent assignment
 */
export function requiresCallAgent(status: OrderStatus): boolean {
  return status === 'PENDING';
}

/**
 * Check if an order requires delivery agent selection
 */
export function requiresDeliverySelection(status: OrderStatus): boolean {
  return status === 'PACKED';
}

/**
 * Check if delivery agent can be assigned (after selection)
 */
export function canAssignDeliveryAgent(status: OrderStatus): boolean {
  return status === 'DELIVERY_AGENT_SELECTED';
}

/**
 * Get status color for UI
 */
export function getOrderStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'CALL_ASSIGNED':
      return 'default';
    case 'CALL_CONFIRMED':
      return 'success';
    case 'PACKED':
      return 'secondary';
    case 'DELIVERY_AGENT_SELECTED':
      return 'default';
    case 'DELIVERY_ASSIGNED':
      return 'default';
    case 'OUT_FOR_DELIVERY':
      return 'default';
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'destructive';
    case 'RETURNED':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Get human-readable status text
 */
export function getOrderStatusText(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CALL_ASSIGNED':
      return 'Call Assigned';
    case 'CALL_CONFIRMED':
      return 'Call Confirmed';
    case 'PACKED':
      return 'Packed';
    case 'DELIVERY_AGENT_SELECTED':
      return 'Delivery Agent Selected';
    case 'DELIVERY_ASSIGNED':
      return 'Delivery Assigned';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    case 'RETURNED':
      return 'Returned';
    default:
      return status;
  }
}

/**
 * Generate order number (simple implementation)
 */
export function generateOrderNumber(): number {
  // In production, this would be more sophisticated
  return Math.floor(100000 + Math.random() * 900000);
}
