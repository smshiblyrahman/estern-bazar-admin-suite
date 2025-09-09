import { Badge } from '@/components/ui/badge';
import { getOrderStatusColor, getOrderStatusText } from '@/lib/utils/order-workflow';
import { OrderStatus } from '@prisma/client';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const color = getOrderStatusColor(status);
  const text = getOrderStatusText(status);

  return (
    <Badge variant={color as any} className={className}>
      {text}
    </Badge>
  );
}
