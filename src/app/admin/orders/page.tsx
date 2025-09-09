'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Phone, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  MessageSquare,
  ChevronRight,
  MoreHorizontal,
  FastForward
} from 'lucide-react';
import { format } from 'date-fns';
import AssignCallAgentModal from '@/components/modals/AssignCallAgentModal';
import CallLogModal from '@/components/modals/CallLogModal';
import DeliveryAgentModal from '@/components/modals/DeliveryAgentModal';

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  totalCents: number;
  createdAt: string;
  callAssignedAt?: string;
  callConfirmedAt?: string;
  callNotes?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  callAssignedTo?: {
    name: string;
    email: string;
  };
  callAssignedBy?: {
    name: string;
    email: string;
  };
  selectedDeliveryAgent?: {
    id: string;
    name: string;
    phone: string;
  };
  deliveryAgent?: {
    id: string;
    name: string;
    phone: string;
  };
  callAttempts?: Array<{
    id: string;
    outcome: string;
    notes?: string;
    createdAt: string;
    agent: { name: string };
  }>;
  items: Array<{
    quantity: number;
    product: { title: string };
  }>;
}

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  
  // Modal states
  const [assignCallModal, setAssignCallModal] = useState<{open: boolean; order?: Order}>({open: false});
  const [callLogModal, setCallLogModal] = useState<{open: boolean; order?: Order}>({open: false});
  const [deliveryModal, setDeliveryModal] = useState<{open: boolean; order?: Order; mode?: 'select'|'assign'}>({open: false});
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (phaseFilter !== 'all') params.set('phase', phaseFilter);
      
      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, phaseFilter]);

  const handleAssignCallAgent = (agentId: string) => {
    fetchOrders();
  };

  const handleLogCallAttempt = async (outcome: string, notes: string) => {
    if (!callLogModal.order) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/orders/${callLogModal.order.id}/call-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, notes }),
      });

      if (response.ok) {
        setCallLogModal({open: false});
        fetchOrders();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to log call attempt'));
      }
    } catch (error) {
      console.error('Error logging call attempt:', error);
      alert('Error logging call attempt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliveryAction = (agentId: string) => {
    fetchOrders();
  };

  const handleFastForward = async (orderId: string) => {
    if (!confirm('Are you sure you want to fast-forward this order?')) return;

    try {
      const response = await fetch(`/api/orders/${orderId}/fast-forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Fast-forwarded by admin' }),
      });

      if (response.ok) {
        fetchOrders();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to fast-forward order'));
      }
    } catch (error) {
      console.error('Error fast-forwarding order:', error);
      alert('Error fast-forwarding order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CALL_ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'CALL_CONFIRMED': return 'bg-green-100 text-green-800';
      case 'PACKED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERY_AGENT_SELECTED': return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERY_ASSIGNED': return 'bg-cyan-100 text-cyan-800';
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'RETURNED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCallStatus = (order: Order) => {
    if (!order.callAssignedTo) return { text: 'Unassigned', color: 'text-gray-600' };
    if (order.callConfirmedAt) return { text: 'Confirmed', color: 'text-green-600' };
    return { text: `Assigned to ${order.callAssignedTo.name}`, color: 'text-blue-600' };
  };

  const canAssignCallAgent = (order: Order) => {
    return session?.user?.role === 'SUPER_ADMIN' && order.status === 'PENDING';
  };

  const canLogCallAttempt = (order: Order) => {
    return order.status === 'CALL_ASSIGNED' && order.callAssignedTo;
  };

  const canSelectDeliveryAgent = (order: Order) => {
    return order.status === 'PACKED';
  };

  const canAssignDeliveryAgent = (order: Order) => {
    return order.status === 'DELIVERY_AGENT_SELECTED' && order.selectedDeliveryAgent;
  };

  const formatPrice = (cents: number) => `৳${(cents / 100).toFixed(2)}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-gray-600 mt-1">
            Manage customer orders and track fulfillment workflow
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CALL_ASSIGNED">Call Assigned</SelectItem>
                <SelectItem value="CALL_CONFIRMED">Call Confirmed</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="DELIVERY_AGENT_SELECTED">Delivery Selected</SelectItem>
                <SelectItem value="DELIVERY_ASSIGNED">Delivery Assigned</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="call">Call Phase</SelectItem>
                <SelectItem value="delivery">Delivery Phase</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>{orders.length} orders</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Call Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const callStatus = getCallStatus(order);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-semibold">#{order.orderNumber}</div>
                            <div className="text-sm text-gray-500">
                              {order.items.length} item(s)
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium">{order.customer.name}</div>
                            <div className="text-sm text-gray-500">{order.customer.email}</div>
                            {order.customer.phone && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {order.customer.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`text-sm ${callStatus.color}`}>
                            {callStatus.text}
                          </div>
                          {order.callNotes && (
                            <div className="flex items-center text-xs text-gray-500 mt-1" title={order.callNotes}>
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Notes
                            </div>
                          )}
                          {order.callAttempts && order.callAttempts.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {order.callAttempts.length} attempt(s)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {order.deliveryAgent ? (
                              <div className="text-green-600">
                                <div className="flex items-center">
                                  <Truck className="h-3 w-3 mr-1" />
                                  {order.deliveryAgent.name}
                                </div>
                              </div>
                            ) : order.selectedDeliveryAgent ? (
                              <div className="text-blue-600">
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {order.selectedDeliveryAgent.name} (Selected)
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500">Not assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{formatPrice(order.totalCents)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600">
                            {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            {canAssignCallAgent(order) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAssignCallModal({open: true, order})}
                                title="Assign Call Agent"
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {canLogCallAttempt(order) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCallLogModal({open: true, order})}
                                title="Log Call Attempt"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                            )}

                            {canSelectDeliveryAgent(order) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeliveryModal({open: true, order, mode: 'select'})}
                                title="Select Delivery Agent"
                              >
                                <User className="h-3 w-3" />
                              </Button>
                            )}

                            {canAssignDeliveryAgent(order) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeliveryModal({open: true, order, mode: 'assign'})}
                                title="Assign Delivery Agent"
                              >
                                <Truck className="h-3 w-3" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFastForward(order.id)}
                              title="Fast Forward"
                            >
                              <FastForward className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {assignCallModal.open && assignCallModal.order && (
        <AssignCallAgentModal
          isOpen={assignCallModal.open}
          onClose={() => setAssignCallModal({open: false})}
          onAssign={handleAssignCallAgent}
          orderId={assignCallModal.order.id}
          orderNumber={assignCallModal.order.orderNumber}
        />
      )}

      {callLogModal.open && callLogModal.order && (
        <CallLogModal
          isOpen={callLogModal.open}
          onClose={() => setCallLogModal({open: false})}
          onSubmit={handleLogCallAttempt}
          orderId={callLogModal.order.id}
          orderNumber={callLogModal.order.orderNumber}
          customerName={callLogModal.order.customer.name}
          customerPhone={callLogModal.order.customer.phone}
          submitting={submitting}
        />
      )}

      {deliveryModal.open && deliveryModal.order && deliveryModal.mode && (
        <DeliveryAgentModal
          isOpen={deliveryModal.open}
          onClose={() => setDeliveryModal({open: false})}
          onSelect={handleDeliveryAction}
          mode={deliveryModal.mode}
          orderId={deliveryModal.order.id}
          selectedAgentId={deliveryModal.order.selectedDeliveryAgent?.id}
          title={
            deliveryModal.mode === 'select' 
              ? `Select Delivery Agent - Order #${deliveryModal.order.orderNumber}`
              : `Assign Delivery Agent - Order #${deliveryModal.order.orderNumber}`
          }
        />
      )}
    </div>
  );
}