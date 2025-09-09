'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KPICard from '@/components/analytics/KPICard';
import SimpleChart from '@/components/analytics/SimpleChart';
import { 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package, 
  TrendingUp,
  AlertTriangle,
  Truck,
  Eye,
  Calendar,
  Download
} from 'lucide-react';

interface KPI {
  value: string | number;
  label: string;
  change?: number;
  formatted?: string;
  status?: 'success' | 'warning' | 'danger';
}

interface AnalyticsSummary {
  period: string;
  kpis: {
    todayOrders: KPI;
    totalRevenue: KPI;
    inFlightOrders: KPI;
    visitorsToday: KPI;
    newCustomers: KPI;
    totalProducts: KPI;
    lowStockProducts: KPI;
    deliveryAgents: KPI;
    orders: KPI;
  };
  ordersByStatus: Record<string, number>;
}

interface SeriesData {
  period: string;
  metric: string;
  data: Array<{ date: string; value: number }>;
}

interface TopProduct {
  product: {
    id: string;
    title: string;
    priceCents: number;
    image?: string;
  };
  metrics: {
    quantitySold: number;
    totalRevenue: number;
    orderCount: number;
  };
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [ordersChart, setOrdersChart] = useState<SeriesData | null>(null);
  const [revenueChart, setRevenueChart] = useState<SeriesData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, ordersRes, revenueRes, productsRes] = await Promise.all([
        fetch(`/api/analytics/summary?period=${period}`),
        fetch(`/api/analytics/series?period=${period}&metric=orders`),
        fetch(`/api/analytics/series?period=${period}&metric=revenue`),
        fetch(`/api/analytics/top-products?period=${period}&limit=5`),
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

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setTopProducts(productsData.products || []);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const formatPrice = (cents: number) => {
    return `৳${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title={summary.kpis.todayOrders.label}
            value={summary.kpis.todayOrders.value}
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KPICard
            title={summary.kpis.totalRevenue.label}
            value={summary.kpis.totalRevenue.formatted || summary.kpis.totalRevenue.value}
            change={summary.kpis.totalRevenue.change}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            title={summary.kpis.newCustomers.label}
            value={summary.kpis.newCustomers.value}
            change={summary.kpis.newCustomers.change}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            title={summary.kpis.inFlightOrders.label}
            value={summary.kpis.inFlightOrders.value}
            icon={<Package className="h-5 w-5" />}
          />
          <KPICard
            title={summary.kpis.orders.label}
            value={summary.kpis.orders.value}
            change={summary.kpis.orders.change}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPICard
            title={summary.kpis.totalProducts.label}
            value={summary.kpis.totalProducts.value}
            icon={<Package className="h-5 w-5" />}
          />
          <KPICard
            title={summary.kpis.lowStockProducts.label}
            value={summary.kpis.lowStockProducts.value}
            status={summary.kpis.lowStockProducts.status as any}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KPICard
            title={summary.kpis.deliveryAgents.label}
            value={summary.kpis.deliveryAgents.value}
            icon={<Truck className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ordersChart && (
          <SimpleChart
            title="Orders Over Time"
            data={ordersChart.data}
            color="#3b82f6"
            type="line"
          />
        )}
        
        {revenueChart && (
          <SimpleChart
            title="Revenue Over Time"
            data={revenueChart.data}
            color="#10b981"
            type="bar"
          />
        )}
      </div>

      {/* Top Products & Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Top Products</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((item, index) => (
                <div key={item.product.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.product.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.metrics.quantitySold} sold • {formatPrice(item.metrics.totalRevenue)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {item.metrics.orderCount} orders
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No product data available
            </div>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Order Status</h3>
          {summary?.ordersByStatus ? (
            <div className="space-y-3">
              {Object.entries(summary.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">
                    {status.toLowerCase().replace('_', ' ')}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No order data available
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start">
            <Package className="h-4 w-4 mr-2" />
            Add New Product
          </Button>
          <Button variant="outline" className="justify-start">
            <Users className="h-4 w-4 mr-2" />
            View Customers
          </Button>
          <Button variant="outline" className="justify-start">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Process Orders
          </Button>
        </div>
      </div>
    </div>
  );
}