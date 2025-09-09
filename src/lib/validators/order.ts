import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    priceCents: z.number().int().min(0, 'Price must be non-negative'),
  })).min(1, 'Order must have at least one item'),
  shippingAddress: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    postalCode: z.string().optional(),
    country: z.string().default('Bangladesh'),
  }),
  notes: z.string().optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED', 
    'PACKED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED'
  ]).optional(),
  deliveryAgentId: z.string().uuid().optional(),
  notes: z.string().optional(),
  statusReason: z.string().optional(),
});

export const assignDeliveryAgentSchema = z.object({
  deliveryAgentId: z.string().uuid('Invalid delivery agent ID'),
  estimatedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const fastForwardOrderSchema = z.object({
  reason: z.string().optional(),
});

export const bulkOrderActionSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, 'At least one order must be selected'),
  action: z.enum(['confirm', 'cancel', 'assign_agent']),
  deliveryAgentId: z.string().uuid().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AssignDeliveryAgentInput = z.infer<typeof assignDeliveryAgentSchema>;
export type FastForwardOrderInput = z.infer<typeof fastForwardOrderSchema>;
export type BulkOrderActionInput = z.infer<typeof bulkOrderActionSchema>;
