import { z } from 'zod';

export const createProductSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  comparePrice: z.number().min(0, 'Compare price must be non-negative').optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative integer'),
  sku: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  featured: z.boolean().default(false),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),
});

export const updateProductSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative').optional(),
  comparePrice: z.number().min(0, 'Compare price must be non-negative').optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative integer').optional(),
  sku: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),
});

export const productMediaSchema = z.object({
  url: z.string().url('Invalid URL'),
  altText: z.string().optional(),
  type: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  position: z.number().int().min(0).default(0),
});

export const bulkProductActionSchema = z.object({
  productIds: z.array(z.string()).min(1, 'At least one product must be selected'),
  action: z.enum(['publish', 'unpublish', 'archive', 'delete']),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductMediaInput = z.infer<typeof productMediaSchema>;
export type BulkProductActionInput = z.infer<typeof bulkProductActionSchema>;
