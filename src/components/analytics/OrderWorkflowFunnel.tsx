'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Phone, 
  CheckCircle, 
  Package, 
  Truck, 
  MapPin,
  Home,
  ArrowDown,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface FunnelStep {
  status: string;
  label: string;
  icon: any;
  color: string;
  count: number;
  percentage: number;
  avgTimeHours?: number;
  conversionRate?: number;
}

interface WorkflowMetrics {
  totalOrders: number;
  avgCallConfirmationTime: number;
  avgDeliveryTime: number;
  callAttemptsPerOrder: number;
  steps: FunnelStep[];
}

export default function OrderWorkflowFunnel() {
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // For now, we'll use mock data. In a real app, this would fetch from an API
      const mockMetrics: WorkflowMetrics = {
        totalOrders: 1250,
        avgCallConfirmationTime: 2.5,
        avgDeliveryTime: 18.3,
        callAttemptsPerOrder: 1.8,
        steps: [
          {
            status: 'PENDING',
            label: 'Order Placed',
            icon: Clock,
            color: 'bg-yellow-500',
            count: 1250,
            percentage: 100,
            avgTimeHours: 0,
          },
          {
            status: 'CALL_ASSIGNED',
            label: 'Call Assigned',
            icon: Phone,
            color: 'bg-blue-500',
            count: 1180,
            percentage: 94.4,
            avgTimeHours: 0.5,
            conversionRate: 94.4,
          },
          {
            status: 'CALL_CONFIRMED',
            label: 'Call Confirmed',
            icon: CheckCircle,
            color: 'bg-green-500',
            count: 1050,
            percentage: 84.0,
            avgTimeHours: 2.5,
            conversionRate: 89.0,
          },
          {
            status: 'PACKED',
            label: 'Packed',
            icon: Package,
            color: 'bg-purple-500',
            count: 1020,
            percentage: 81.6,
            avgTimeHours: 4.2,
            conversionRate: 97.1,
          },
          {
            status: 'DELIVERY_AGENT_SELECTED',
            label: 'Agent Selected',
            icon: Truck,
            color: 'bg-indigo-500',
            count: 980,
            percentage: 78.4,
            avgTimeHours: 6.1,
            conversionRate: 96.1,
          },
          {
            status: 'DELIVERY_ASSIGNED',
            label: 'Agent Assigned',
            icon: MapPin,
            color: 'bg-cyan-500',
            count: 950,
            percentage: 76.0,
            avgTimeHours: 8.5,
            conversionRate: 96.9,
          },
          {
            status: 'OUT_FOR_DELIVERY',
            label: 'Out for Delivery',
            icon: Truck,
            color: 'bg-orange-500',
            count: 920,
            percentage: 73.6,
            avgTimeHours: 12.3,
            conversionRate: 96.8,
          },
          {
            status: 'DELIVERED',
            label: 'Delivered',
            icon: Home,
            color: 'bg-green-600',
            count: 880,
            percentage: 70.4,
            avgTimeHours: 18.3,
            conversionRate: 95.7,
          },
        ],
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching workflow metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeframe]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Workflow Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Workflow Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Failed to load metrics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{metrics.totalOrders.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Call Confirmation</p>
                <p className="text-2xl font-bold">{metrics.avgCallConfirmationTime}h</p>
              </div>
              <Phone className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Delivery Time</p>
                <p className="text-2xl font-bold">{metrics.avgDeliveryTime}h</p>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Call Attempts/Order</p>
                <p className="text-2xl font-bold">{metrics.callAttemptsPerOrder}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Order Workflow Funnel
          </CardTitle>
          <p className="text-sm text-gray-600">
            Track orders through each stage of the fulfillment process
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.steps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === metrics.steps.length - 1;
              const previousStep = index > 0 ? metrics.steps[index - 1] : null;
              const dropoffCount = previousStep ? previousStep.count - step.count : 0;
              const dropoffRate = previousStep && previousStep.count > 0 
                ? ((dropoffCount / previousStep.count) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={step.status}>
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${step.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Step Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{step.label}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {step.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span className="font-medium">{step.count.toLocaleString()} orders</span>
                        <span>{step.percentage.toFixed(1)}% of total</span>
                        {step.conversionRate && (
                          <span className="flex items-center">
                            {step.conversionRate >= 90 ? (
                              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                            )}
                            {step.conversionRate.toFixed(1)}% conversion
                          </span>
                        )}
                        {step.avgTimeHours !== undefined && step.avgTimeHours > 0 && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Avg: {step.avgTimeHours}h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${step.color}`}
                          style={{ width: `${step.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {step.percentage.toFixed(1)}%
                      </div>
                    </div>

                    {/* Drop-off Info */}
                    {dropoffCount > 0 && (
                      <div className="text-right text-sm">
                        <div className="text-red-600 font-medium">
                          -{dropoffCount.toLocaleString()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {dropoffRate}% drop-off
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow between steps */}
                  {!isLast && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Funnel Performance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Overall Conversion Rate:</span>
                <span className="font-semibold ml-2">
                  {((metrics.steps[metrics.steps.length - 1].count / metrics.totalOrders) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-blue-700">Biggest Drop-off:</span>
                <span className="font-semibold ml-2">Call Assignment → Confirmation</span>
              </div>
              <div>
                <span className="text-blue-700">Best Conversion:</span>
                <span className="font-semibold ml-2">Packed → Agent Selection</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
