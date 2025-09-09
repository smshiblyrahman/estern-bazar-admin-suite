'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Phone, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (outcome: string, notes: string) => void;
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerPhone?: string;
  submitting?: boolean;
}

const CALL_OUTCOMES = [
  { value: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle, color: 'text-green-600' },
  { value: 'UNREACHABLE', label: 'Unreachable', icon: XCircle, color: 'text-red-600' },
  { value: 'CUSTOMER_CANCELLED', label: 'Customer Cancelled', icon: XCircle, color: 'text-gray-600' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', icon: AlertTriangle, color: 'text-yellow-600' },
];

export default function CallLogModal({
  isOpen,
  onClose,
  onSubmit,
  orderId,
  orderNumber,
  customerName,
  customerPhone,
  submitting = false
}: CallLogModalProps) {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!outcome) return;
    onSubmit(outcome, notes);
  };

  const handleClose = () => {
    setOutcome('');
    setNotes('');
    onClose();
  };

  const selectedOutcome = CALL_OUTCOMES.find(o => o.value === outcome);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Log Call Attempt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Order Details</h4>
            <div className="space-y-1 text-sm">
              <div><strong>Order:</strong> #{orderNumber}</div>
              <div><strong>Customer:</strong> {customerName}</div>
              {customerPhone && (
                <div className="flex items-center">
                  <strong>Phone:</strong>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {customerPhone}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Call Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call Outcome *
            </label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select call outcome" />
              </SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Outcome Preview */}
          {selectedOutcome && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <selectedOutcome.icon className={`h-4 w-4 ${selectedOutcome.color}`} />
                <span className="font-medium">Selected: {selectedOutcome.label}</span>
              </div>
              {outcome === 'CONFIRMED' && (
                <p className="text-xs text-blue-700 mt-1">
                  Order will be marked as confirmed and moved to fulfillment.
                </p>
              )}
              {outcome === 'CUSTOMER_CANCELLED' && (
                <p className="text-xs text-blue-700 mt-1">
                  Order will be cancelled and removed from the queue.
                </p>
              )}
              {(outcome === 'UNREACHABLE' || outcome === 'WRONG_NUMBER') && (
                <p className="text-xs text-blue-700 mt-1">
                  Order will remain in the call queue for retry.
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call Notes
            </label>
            <Textarea
              placeholder="Add notes about the call, customer feedback, issues encountered, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Quick Notes for common scenarios */}
          {outcome && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quick Notes
              </label>
              <div className="flex flex-wrap gap-2">
                {outcome === 'CONFIRMED' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotes('Customer confirmed order details and delivery address')}
                    >
                      Standard confirmation
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotes('Customer requested delivery time change')}
                    >
                      Time change request
                    </Button>
                  </>
                )}
                {outcome === 'UNREACHABLE' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotes('Phone rang but no answer')}
                    >
                      No answer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotes('Phone switched off or out of coverage')}
                    >
                      Phone off
                    </Button>
                  </>
                )}
                {outcome === 'CUSTOMER_CANCELLED' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotes('Customer no longer needs the items')}
                    >
                      No longer needed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotes('Customer found better price elsewhere')}
                    >
                      Found better price
                    </Button>
                  </>
                )}
                {outcome === 'WRONG_NUMBER' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNotes('Number belongs to someone else')}
                  >
                    Different person
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!outcome || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              'Log Call Attempt'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
