import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  status?: 'success' | 'warning' | 'danger';
  formatted?: string;
  icon?: React.ReactNode;
}

export default function KPICard({ 
  title, 
  value, 
  change, 
  status,
  formatted,
  icon 
}: KPICardProps) {
  const displayValue = formatted || value;
  
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'danger': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {displayValue}
          </div>
          
          {change !== undefined && (
            <div className={`flex items-center space-x-1 text-sm ${getChangeColor(change)}`}>
              {getChangeIcon(change)}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {status && (
          <Badge variant={getStatusColor(status)}>
            {status}
          </Badge>
        )}
      </div>
    </div>
  );
}
