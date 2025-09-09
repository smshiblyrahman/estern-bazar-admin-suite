'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Phone, User, CheckCircle, Loader2 } from 'lucide-react';

interface CallAgent {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  assignedOrders?: number;
}

interface AssignCallAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (agentId: string) => void;
  orderId: string;
  orderNumber: number;
}

export default function AssignCallAgentModal({
  isOpen,
  onClose,
  onAssign,
  orderId,
  orderNumber
}: AssignCallAgentModalProps) {
  const [agents, setAgents] = useState<CallAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<CallAgent | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCallAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/call-agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching call agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCallAgents();
      setSelectedAgent(null);
      setNote('');
      setSearch('');
    }
  }, [isOpen]);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedAgent) return;

    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/orders/${orderId}/assign-call-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId: selectedAgent.id,
          note: note || undefined
        }),
      });

      if (response.ok) {
        onAssign(selectedAgent.id);
        onClose();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to assign call agent'));
      }
    } catch (error) {
      console.error('Error assigning call agent:', error);
      alert('Error assigning call agent');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Assign Call Agent - Order #{orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search call agents by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Agents List */}
          <div className="max-h-60 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading call agents...
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No call agents found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedAgent?.id === agent.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                          <p className="text-sm text-gray-500">{agent.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {agent.role}
                            </Badge>
                            <Badge className={getStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {agent.assignedOrders !== undefined && (
                          <div className="text-right text-sm text-gray-600">
                            <div className="font-semibold">{agent.assignedOrders}</div>
                            <div>Assigned</div>
                          </div>
                        )}
                        {selectedAgent?.id === agent.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Agent Details */}
          {selectedAgent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Selected Agent</h4>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedAgent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedAgent.name}</p>
                  <p className="text-sm text-blue-700">{selectedAgent.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Note (Optional)
            </label>
            <Textarea
              placeholder="Add a note about this assignment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedAgent || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Agent'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
