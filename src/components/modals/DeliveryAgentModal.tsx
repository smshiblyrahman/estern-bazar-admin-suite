'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Truck, Phone, MapPin, Star, CheckCircle, Loader2 } from 'lucide-react';

interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  email: string;
  active: boolean;
  status: string;
  zone?: string;
  rating?: number;
  totalDeliveries?: number;
  activeOrders?: number;
}

interface DeliveryAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agentId: string) => void;
  mode: 'select' | 'assign';
  orderId: string;
  selectedAgentId?: string;
  title: string;
}

export default function DeliveryAgentModal({
  isOpen,
  onClose,
  onSelect,
  mode,
  orderId,
  selectedAgentId,
  title
}: DeliveryAgentModalProps) {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/delivery-agents?active=true');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching delivery agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.phone.includes(search) ||
    agent.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (agentId: string) => {
    try {
      setSubmitting(true);
      
      const endpoint = mode === 'select' 
        ? `/api/orders/${orderId}/select-delivery-agent`
        : `/api/orders/${orderId}/assign-delivery-agent`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (response.ok) {
        onSelect(agentId);
        onClose();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || `Failed to ${mode} delivery agent`));
      }
    } catch (error) {
      console.error(`Error ${mode}ing delivery agent:`, error);
      alert(`Error ${mode}ing delivery agent`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search agents by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Agents List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading agents...
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No delivery agents found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedAgentId === agent.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => !submitting && handleSelect(agent.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span>{agent.phone}</span>
                          </div>
                          <p className="text-sm text-gray-500">{agent.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                        {selectedAgentId === agent.id && (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="text-center">
                        <div className="font-semibold">{agent.totalDeliveries || 0}</div>
                        <div>Deliveries</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{agent.activeOrders || 0}</div>
                        <div>Active</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold flex items-center justify-center">
                          {agent.rating || 0}
                          <Star className="h-3 w-3 ml-1 text-yellow-400 fill-current" />
                        </div>
                        <div>Rating</div>
                      </div>
                    </div>

                    {agent.zone && (
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        Zone: {agent.zone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
