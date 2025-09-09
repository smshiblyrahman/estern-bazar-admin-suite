'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneCall, 
  Clock, 
  User, 
  Package, 
  CheckCircle, 
  XCircle, 
  Calendar,
  MessageSquare,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  orderNumber: number;
  totalCents: number;
  status: string;
  createdAt: string;
  customer: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  items: Array<{
    quantity: number;
    product: {
      title: string;
    };
  }>;
  callAttempts?: Array<{
    id: string;
    outcome: string;
    notes: string | null;
    createdAt: string;
    agent: {
      name: string;
    };
  }>;
}

interface CallLogForm {
  outcome: string;
  notes: string;
}

export default function CallQueuePage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCallForm, setShowCallForm] = useState(false);
  const [callForm, setCallForm] = useState<CallLogForm>({
    outcome: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders?callAssignedToId=' + session?.user?.id + '&status=CALL_ASSIGNED');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchOrders();
    }
  }, [session?.user?.id, fetchOrders]);

  const handleStartCall = (order: Order) => {
    setSelectedOrder(order);
    setCallForm({
      outcome: '',
      notes: '',
    });
    setShowCallForm(true);
  };

  const handleSubmitCallLog = async () => {
    if (!selectedOrder || !callForm.outcome) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/orders/${selectedOrder.id}/call-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: callForm.outcome,
          notes: callForm.notes || undefined,
        }),
      });

      if (response.ok) {
        setShowCallForm(false);
        setSelectedOrder(null);
        fetchOrders(); // Refresh the queue
        alert('Call log submitted successfully!');
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to submit call log'));
      }
    } catch (error) {
      console.error('Error submitting call log:', error);
      alert('Error submitting call log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickConfirm = async (order: Order) => {
    if (!confirm('Are you sure you want to mark this order as confirmed?')) return;

    try {
      const response = await fetch(`/api/orders/${order.id}/call-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: 'CONFIRMED',
          notes: 'Customer confirmed order',
        }),
      });

      if (response.ok) {
        fetchOrders(); // Refresh the queue
        alert('Order marked as confirmed!');
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to confirm order'));
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Error confirming order');
    }
  };

  const formatPrice = (cents: number) => `৳${(cents / 100).toFixed(2)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CALL_ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'CALL_CONFIRMED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'CONFIRMED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'UNREACHABLE': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'CUSTOMER_CANCELLED': return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'WRONG_NUMBER': return <Phone className="h-4 w-4 text-yellow-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Call Queue</h1>
          <p className="text-gray-600 mt-1">
            Orders assigned to you for customer confirmation
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Calls</p>
              <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
            </div>
            <Phone className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(orders.reduce((sum, order) => sum + order.totalCents, 0))}
              </p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Order</p>
              <p className="text-2xl font-bold text-purple-600">
                {orders.length > 0 
                  ? formatPrice(orders.reduce((sum, order) => sum + order.totalCents, 0) / orders.length)
                  : '৳0.00'
                }
              </p>
            </div>
            <User className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Orders Queue */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Orders to Call</h2>
        </div>
        
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No orders in your queue</p>
            <p className="text-sm">New orders will appear here when assigned to you</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold">Order #{order.orderNumber}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Customer</h4>
                        <p className="text-sm text-gray-600">{order.customer.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{order.customer.email}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {order.customer.phone || 'No phone'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">Order Details</h4>
                        <p className="text-sm text-gray-600">
                          {order.items.length} item(s) • {formatPrice(order.totalCents)}
                        </p>
                        <div className="text-sm text-gray-600">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx}>
                              {item.quantity}x {item.product.title}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{order.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Previous call attempts */}
                    {order.callAttempts && order.callAttempts.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Previous Attempts ({order.callAttempts.length})
                        </h5>
                        <div className="space-y-1">
                          {order.callAttempts.slice(0, 3).map((attempt) => (
                            <div key={attempt.id} className="flex items-center text-sm text-gray-600">
                              {getOutcomeIcon(attempt.outcome)}
                              <span className="ml-2">
                                {attempt.outcome.replace('_', ' ')} by {attempt.agent.name}
                              </span>
                              <span className="ml-auto">
                                {format(new Date(attempt.createdAt), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex flex-col space-y-2">
                    <Button
                      onClick={() => handleStartCall(order)}
                      className="flex items-center"
                      disabled={!order.customer.phone}
                    >
                      <PhoneCall className="h-4 w-4 mr-2" />
                      Call Customer
                    </Button>
                    
                    <Button
                      onClick={() => handleQuickConfirm(order)}
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Confirmed
                    </Button>
                    
                    {!order.customer.phone && (
                      <div className="flex items-center text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        No phone number
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Log Modal */}
      {showCallForm && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Log Call - Order #{selectedOrder.orderNumber}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Call Outcome *</label>
                <Select value={callForm.outcome} onValueChange={(value) => setCallForm(prev => ({ ...prev, outcome: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="UNREACHABLE">Unreachable</SelectItem>
                    <SelectItem value="CUSTOMER_CANCELLED">Customer Cancelled</SelectItem>
                    <SelectItem value="WRONG_NUMBER">Wrong Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea
                  value={callForm.notes}
                  onChange={(e) => setCallForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Call notes, customer feedback, etc."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={handleSubmitCallLog}
                disabled={!callForm.outcome || submitting}
                className="flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Call Log'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCallForm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
