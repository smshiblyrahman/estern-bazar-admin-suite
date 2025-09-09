'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Truck, Phone, User } from 'lucide-react';

interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType?: string;
  status: string;
  _count: {
    orders: number;
    completedOrders: number;
  };
}

interface AssignDeliveryModalProps {
  orderId: string;
  orderNumber: number;
  currentAgentId?: string;
  onAssign: (data: {
    deliveryAgentId: string;
    estimatedDeliveryDate?: string;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export default function AssignDeliveryModal({
  orderId,
  orderNumber,
  currentAgentId,
  onAssign,
  onClose,
  loading = false
}: AssignDeliveryModalProps) {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(currentAgentId || '');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    fetchAvailableAgents();
  }, []);

  const fetchAvailableAgents = async () => {
    try {
      const response = await fetch('/api/delivery-agents?availableOnly=false');
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching delivery agents:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAgentId) {
      alert('Please select a delivery agent');
      return;
    }

    await onAssign({
      deliveryAgentId: selectedAgentId,
      estimatedDeliveryDate: estimatedDeliveryDate || undefined,
      notes: notes || undefined,
    });
  };

  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

  // Get tomorrow as default estimated delivery date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Assign Delivery Agent - Order #{orderNumber}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Delivery Agent Selection */}
          <div>
            <Label htmlFor="deliveryAgent">Delivery Agent *</Label>
            {loadingAgents ? (
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <Phone className="h-3 w-3" />
                            <span>{agent.phone}</span>
                            {agent.vehicleType && (
                              <>
                                <Truck className="h-3 w-3" />
                                <span>{agent.vehicleType}</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {agent._count.completedOrders} completed orders
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          agent.status === 'AVAILABLE' 
                            ? 'bg-green-100 text-green-800'
                            : agent.status === 'BUSY'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.status.toLowerCase()}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Agent Info */}
          {selectedAgent && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium">{selectedAgent.name}</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3" />
                  <span>{selectedAgent.phone}</span>
                </div>
                {selectedAgent.vehicleType && (
                  <div className="flex items-center space-x-2">
                    <Truck className="h-3 w-3" />
                    <span>{selectedAgent.vehicleType}</span>
                  </div>
                )}
                <div className="text-xs">
                  Active orders: {selectedAgent._count.orders} | 
                  Completed: {selectedAgent._count.completedOrders}
                </div>
              </div>
            </div>
          )}

          {/* Estimated Delivery Date */}
          <div>
            <Label htmlFor="estimatedDeliveryDate">Estimated Delivery Date</Label>
            <Input
              id="estimatedDeliveryDate"
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              min={tomorrowString}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedAgentId}
            >
              {loading ? 'Assigning...' : 'Assign Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
