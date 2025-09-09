'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KPICard from '@/components/analytics/KPICard';
import SimpleChart from '@/components/analytics/SimpleChart';
import OrderWorkflowFunnel from '@/components/analytics/OrderWorkflowFunnel';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  DollarSign,
  Download,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';

interface AnalyticsSummary {
  period: string;
  kpis: {
    todayOrders: { value: number; label: string };
    totalRevenue: { value: number; label: string; change?: number; formatted?: string };
    newCustomers: { value: number; label: string; change?: number };
    visitorsToday: { value: number; label: string };
    orders: { value: number; label: string; change?: number };
    totalProducts: { value: number; label: string };
    lowStockProducts: { value: number; label: string; status?: string };
    deliveryAgents: { value: string; label: string };
    inFlightOrders: { value: number; label: string };
  };
  ordersByStatus: Record<string, number>;
}

interface SeriesData {
  period: string;
  metric: string;
  data: Array<{ date: string; value: number }>;
}

export default function SuperAdminAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [ordersChart, setOrdersChart] = useState<SeriesData | null>(null);
  const [revenueChart, setRevenueChart] = useState<SeriesData | null>(null);
  const [customersChart, setCustomersChart] = useState<SeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, ordersRes, revenueRes, customersRes] = await Promise.all([
        fetch(`/api/analytics/summary?period=${period}`),
        fetch(`/api/analytics/series?period=${period}&metric=orders`),
        fetch(`/api/analytics/series?period=${period}&metric=revenue`),
        fetch(`/api/analytics/series?period=${period}&metric=customers`),
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrdersChart(ordersData);
      }

      if (revenueRes.ok) {
        const revenueData = await revenueRes.json();
        setRevenueChart(revenueData);
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomersChart(customersData);
      }

      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const exportData = async () => {
    try {
      // In a real implementation, this would generate and download a CSV/Excel file
      const data = {
        summary,
        ordersChart,
        revenueChart,
        customersChart,
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard
            title="Visitors Today"
            value={summary.kpis.visitorsToday.value}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            title="New Customers"
            value={summary.kpis.newCustomers.value}
            change={summary.kpis.newCustomers.change}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            title="Total Orders"
            value={summary.kpis.orders.value}
            change={summary.kpis.orders.change}
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KPICard
            title="Total Revenue"
            value={summary.kpis.totalRevenue.formatted || summary.kpis.totalRevenue.value}
            change={summary.kpis.totalRevenue.change}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            title="Today's Orders"
            value={summary.kpis.todayOrders.value}
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KPICard
            title="In-Flight Orders"
            value={summary.kpis.inFlightOrders.value}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPICard
            title="Active Products"
            value={summary.kpis.totalProducts.value}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <KPICard
            title="Low Stock Alerts"
            value={summary.kpis.lowStockProducts.value}
            status={summary.kpis.lowStockProducts.status as any}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <KPICard
            title="Delivery Agents"
            value={summary.kpis.deliveryAgents.value}
            icon={<Users className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Order Workflow Funnel */}
      <OrderWorkflowFunnel />

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ordersChart && (
          <SimpleChart
            title="Orders by Day"
            data={ordersChart.data}
            color="#3b82f6"
            type="line"
          />
        )}
        
        {revenueChart && (
          <SimpleChart
            title="Revenue by Day"
            data={revenueChart.data}
            color="#10b981"
            type="bar"
          />
        )}

        {customersChart && (
          <SimpleChart
            title="New Customers by Day"
            data={customersChart.data}
            color="#8b5cf6"
            type="line"
          />
        )}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Order Status Breakdown</h3>
          {summary?.ordersByStatus ? (
            <div className="space-y-4">
              {Object.entries(summary.ordersByStatus)
                .sort(([,a], [,b]) => b - a)
                .map(([status, count]) => {
                  const total = Object.values(summary.ordersByStatus).reduce((sum, val) => sum + val, 0);
                  const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0';
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          status === 'DELIVERED' ? 'bg-green-500' :
                          status === 'PENDING' ? 'bg-yellow-500' :
                          status === 'CANCELLED' ? 'bg-red-500' :
                          status === 'OUT_FOR_DELIVERY' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="text-sm text-gray-600 capitalize">
                          {status.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{count}</div>
                        <div className="text-xs text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No order data available
            </div>
          )}
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
          <div className="space-y-4">
            {summary && (
              <>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm font-medium text-blue-900">Average Order Value</span>
                  <span className="font-semibold text-blue-900">
                    {summary.kpis.orders.value > 0 
                      ? `৳${((summary.kpis.totalRevenue.value / summary.kpis.orders.value) / 100).toFixed(2)}`
                      : '৳0.00'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm font-medium text-green-900">Conversion Rate</span>
                  <span className="font-semibold text-green-900">
                    {summary.kpis.visitorsToday.value > 0 
                      ? `${((summary.kpis.todayOrders.value / summary.kpis.visitorsToday.value) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="text-sm font-medium text-purple-900">Customer Growth</span>
                  <span className="font-semibold text-purple-900">
                    {summary.kpis.newCustomers.change !== undefined 
                      ? `${summary.kpis.newCustomers.change > 0 ? '+' : ''}${summary.kpis.newCustomers.change.toFixed(1)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
