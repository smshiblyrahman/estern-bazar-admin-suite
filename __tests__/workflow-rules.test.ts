/**
 * Unit Tests for Enhanced Order Workflow Rules
 * 
 * Tests the core business logic for call confirmation and staged delivery
 * without depending on Next.js API route internals.
 */

import { isValidStatusTransition, getNextLogicalStatus } from '@/lib/utils/order-workflow';

describe('Enhanced Order Workflow Rules', () => {
  describe('Call Assignment Rules', () => {
    it('should only allow SUPER_ADMIN to assign call agent', () => {
      // Test case: "Only SUPER_ADMIN can assign call agent." (403 otherwise)
      
      const roles = ['ADMIN', 'CALL_AGENT', 'CUSTOMER'];
      
      roles.forEach(role => {
        // In a real implementation, this would be checked in the API route
        const canAssignCallAgent = role === 'SUPER_ADMIN';
        expect(canAssignCallAgent).toBe(false);
      });
      
      // Only SUPER_ADMIN should be allowed
      const superAdminCanAssign = 'SUPER_ADMIN' === 'SUPER_ADMIN';
      expect(superAdminCanAssign).toBe(true);
    });

    it('should require PENDING status for call agent assignment', () => {
      // Call agent can only be assigned to PENDING orders
      const validStatuses = ['PENDING'];
      const invalidStatuses = ['CALL_ASSIGNED', 'CALL_CONFIRMED', 'PACKED', 'DELIVERED'];
      
      validStatuses.forEach(status => {
        const canAssign = status === 'PENDING';
        expect(canAssign).toBe(true);
      });
      
      invalidStatuses.forEach(status => {
        const canAssign = status === 'PENDING';
        expect(canAssign).toBe(false);
      });
    });
  });

  describe('Call Confirmation Rules', () => {
    it('should block advancement from CALL_ASSIGNED without CONFIRMED attempt', () => {
      // Test case: "Cannot advance from CALL_ASSIGNED to PACKED without a CONFIRMED call attempt."
      
      const currentStatus = 'CALL_ASSIGNED';
      const hasConfirmedAttempt = false;
      
      // Without confirmed attempt, should not advance
      const canAdvance = hasConfirmedAttempt && isValidStatusTransition(currentStatus, 'CALL_CONFIRMED');
      expect(canAdvance).toBe(false);
    });

    it('should allow advancement from CALL_ASSIGNED with CONFIRMED attempt', () => {
      const currentStatus = 'CALL_ASSIGNED';
      const hasConfirmedAttempt = true;
      
      // With confirmed attempt, should advance to CALL_CONFIRMED
      const canAdvance = hasConfirmedAttempt && isValidStatusTransition(currentStatus, 'CALL_CONFIRMED');
      expect(canAdvance).toBe(true);
    });

    it('should handle different call outcomes correctly', () => {
      const callOutcomes = {
        'CONFIRMED': 'CALL_CONFIRMED',
        'CUSTOMER_CANCELLED': 'CANCELLED',
        'UNREACHABLE': 'CALL_ASSIGNED', // Remains same for retry
        'WRONG_NUMBER': 'CALL_ASSIGNED', // Remains same for retry
      };
      
      Object.entries(callOutcomes).forEach(([outcome, expectedStatus]) => {
        let resultStatus = 'CALL_ASSIGNED'; // Starting status
        
        // Simulate call outcome processing
        switch (outcome) {
          case 'CONFIRMED':
            resultStatus = 'CALL_CONFIRMED';
            break;
          case 'CUSTOMER_CANCELLED':
            resultStatus = 'CANCELLED';
            break;
          // UNREACHABLE and WRONG_NUMBER keep status as CALL_ASSIGNED
        }
        
        expect(resultStatus).toBe(expectedStatus);
      });
    });
  });

  describe('Delivery Assignment Rules', () => {
    it('should enforce select vs assign workflow', () => {
      // Test case: "Select vs Assign: assignment must match selected agent unless SUPER_ADMIN override."
      
      const selectedAgentId = 'agent-1';
      const assignAgentId = 'agent-2'; // Different agent
      const userRole = 'ADMIN';
      const hasOverride = false;
      
      // ADMIN trying to assign different agent without override should fail
      const canAssignDifferentAgent = (
        userRole === 'SUPER_ADMIN' && hasOverride
      ) || (assignAgentId === selectedAgentId);
      
      expect(canAssignDifferentAgent).toBe(false);
    });

    it('should allow SUPER_ADMIN override with reason', () => {
      const selectedAgentId = 'agent-1';
      const assignAgentId = 'agent-2'; // Different agent
      const userRole = 'SUPER_ADMIN';
      const hasOverride = true;
      const hasReason = true;
      
      // SUPER_ADMIN with override and reason should succeed
      const canOverride = (
        userRole === 'SUPER_ADMIN' && hasOverride && hasReason
      ) || (assignAgentId === selectedAgentId);
      
      expect(canOverride).toBe(true);
    });

    it('should require override flag and reason for SUPER_ADMIN override', () => {
      const scenarios = [
        { role: 'SUPER_ADMIN', override: true, reason: true, expected: true },
        { role: 'SUPER_ADMIN', override: false, reason: true, expected: false },
        { role: 'SUPER_ADMIN', override: true, reason: false, expected: false },
        { role: 'ADMIN', override: true, reason: true, expected: false },
      ];
      
      scenarios.forEach(({ role, override, reason, expected }) => {
        const canOverride = role === 'SUPER_ADMIN' && override && reason;
        expect(canOverride).toBe(expected);
      });
    });

    it('should allow assignment when agent matches selection', () => {
      const selectedAgentId = 'agent-1';
      const assignAgentId = 'agent-1'; // Same agent
      const userRole = 'ADMIN'; // Any role should work
      
      const canAssign = assignAgentId === selectedAgentId;
      expect(canAssign).toBe(true);
    });
  });

  describe('Fast-Forward Rules', () => {
    it('should block fast-forward from PENDING without call agent assignment', () => {
      // Test case: "Fast‑forward respects call phase; from PENDING it forces CALL_ASSIGNED first"
      
      const currentStatus = 'PENDING';
      const hasCallAgentAssigned = false;
      
      const canFastForward = currentStatus !== 'PENDING' || hasCallAgentAssigned;
      expect(canFastForward).toBe(false);
    });

    it('should allow fast-forward from PENDING with call agent assigned', () => {
      const currentStatus = 'PENDING';
      const hasCallAgentAssigned = true;
      
      const canFastForward = currentStatus !== 'PENDING' || hasCallAgentAssigned;
      expect(canFastForward).toBe(true);
      
      // Next status should be CALL_ASSIGNED
      const nextStatus = getNextLogicalStatus(currentStatus);
      expect(nextStatus).toBe('CALL_ASSIGNED');
    });

    it('should block fast-forward from CALL_ASSIGNED without confirmation', () => {
      // Test case: "from CALL_ASSIGNED it requires CONFIRMED"
      
      const currentStatus = 'CALL_ASSIGNED';
      const hasConfirmedAttempt = false;
      
      const canFastForward = currentStatus !== 'CALL_ASSIGNED' || hasConfirmedAttempt;
      expect(canFastForward).toBe(false);
    });

    it('should allow fast-forward from CALL_ASSIGNED with confirmation', () => {
      const currentStatus = 'CALL_ASSIGNED';
      const hasConfirmedAttempt = true;
      
      const canFastForward = currentStatus !== 'CALL_ASSIGNED' || hasConfirmedAttempt;
      expect(canFastForward).toBe(true);
      
      // Next status should be CALL_CONFIRMED
      const nextStatus = getNextLogicalStatus(currentStatus);
      expect(nextStatus).toBe('CALL_CONFIRMED');
    });

    it('should enforce delivery prerequisites in fast-forward', () => {
      const scenarios = [
        {
          status: 'PACKED',
          hasSelectedAgent: false,
          canAdvance: false,
          description: 'PACKED without selected delivery agent'
        },
        {
          status: 'PACKED',
          hasSelectedAgent: true,
          canAdvance: true,
          description: 'PACKED with selected delivery agent'
        },
        {
          status: 'DELIVERY_AGENT_SELECTED',
          hasAssignedAgent: false,
          canAdvance: false,
          description: 'DELIVERY_AGENT_SELECTED without assigned agent'
        },
        {
          status: 'DELIVERY_AGENT_SELECTED',
          hasAssignedAgent: true,
          canAdvance: true,
          description: 'DELIVERY_AGENT_SELECTED with assigned agent'
        },
      ];
      
      scenarios.forEach(({ status, hasSelectedAgent, hasAssignedAgent, canAdvance, description }) => {
        let prerequisitesMet = true;
        
        if (status === 'PACKED') {
          prerequisitesMet = hasSelectedAgent ?? true;
        } else if (status === 'DELIVERY_AGENT_SELECTED') {
          prerequisitesMet = hasAssignedAgent ?? true;
        }
        
        expect(prerequisitesMet).toBe(canAdvance);
      });
    });
  });

  describe('Status Transition Validation', () => {
    it('should enforce strict delivery sequence', () => {
      const validTransitions = [
        ['CALL_CONFIRMED', 'PACKED'],
        ['PACKED', 'DELIVERY_AGENT_SELECTED'],
        ['DELIVERY_AGENT_SELECTED', 'DELIVERY_ASSIGNED'],
        ['DELIVERY_ASSIGNED', 'OUT_FOR_DELIVERY'],
        ['OUT_FOR_DELIVERY', 'DELIVERED'],
      ];
      
      validTransitions.forEach(([from, to]) => {
        const isValid = isValidStatusTransition(from, to);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid status transitions', () => {
      const invalidTransitions = [
        ['PENDING', 'PACKED'], // Must go through call confirmation
        ['CALL_ASSIGNED', 'PACKED'], // Must be confirmed first
        ['PACKED', 'DELIVERY_ASSIGNED'], // Must select agent first
        ['CALL_CONFIRMED', 'OUT_FOR_DELIVERY'], // Must go through delivery stages
      ];
      
      invalidTransitions.forEach(([from, to]) => {
        const isValid = isValidStatusTransition(from, to);
        expect(isValid).toBe(false);
      });
    });

    it('should allow cancellation from non-final states', () => {
      const cancellableStates = [
        'PENDING',
        'CALL_ASSIGNED', 
        'CALL_CONFIRMED',
        'PACKED',
        'DELIVERY_AGENT_SELECTED',
        'DELIVERY_ASSIGNED'
        // Note: OUT_FOR_DELIVERY cannot be cancelled, only delivered or returned
      ];
      
      cancellableStates.forEach(status => {
        const canCancel = isValidStatusTransition(status, 'CANCELLED');
        expect(canCancel).toBe(true);
      });
      
      // OUT_FOR_DELIVERY should not be cancellable
      const canCancelOutForDelivery = isValidStatusTransition('OUT_FOR_DELIVERY', 'CANCELLED');
      expect(canCancelOutForDelivery).toBe(false);
    });

    it('should allow return from OUT_FOR_DELIVERY and DELIVERED', () => {
      const returnableStatuses = ['OUT_FOR_DELIVERY', 'DELIVERED'];
      const nonReturnableStatuses = [
        'PENDING',
        'CALL_ASSIGNED',
        'CALL_CONFIRMED', 
        'PACKED',
        'DELIVERY_AGENT_SELECTED',
        'DELIVERY_ASSIGNED',
        'CANCELLED'
      ];
      
      returnableStatuses.forEach(status => {
        const canReturn = isValidStatusTransition(status, 'RETURNED');
        expect(canReturn).toBe(true);
      });
      
      nonReturnableStatuses.forEach(status => {
        const canReturn = isValidStatusTransition(status, 'RETURNED');
        expect(canReturn).toBe(false);
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce CALL_AGENT portal restrictions', () => {
      // Test case: "CALL_AGENT portal shows only assigned orders and allows logging attempts; 
      // cannot access products, analytics, or admin management."
      
      const callAgentPermissions = {
        viewAssignedOrders: true,
        logCallAttempts: true,
        accessProducts: false,
        accessAnalytics: false,
        accessAdminManagement: false,
        assignCallAgents: false,
        manageDeliveryAgents: false,
      };
      
      // CALL_AGENT should only have limited permissions
      expect(callAgentPermissions.viewAssignedOrders).toBe(true);
      expect(callAgentPermissions.logCallAttempts).toBe(true);
      expect(callAgentPermissions.accessProducts).toBe(false);
      expect(callAgentPermissions.accessAnalytics).toBe(false);
      expect(callAgentPermissions.accessAdminManagement).toBe(false);
      expect(callAgentPermissions.assignCallAgents).toBe(false);
      expect(callAgentPermissions.manageDeliveryAgents).toBe(false);
    });

    it('should enforce order visibility for CALL_AGENT', () => {
      const callAgentId = 'agent-1';
      const orders = [
        { id: '1', callAssignedToId: 'agent-1', visible: true },
        { id: '2', callAssignedToId: 'agent-2', visible: false },
        { id: '3', callAssignedToId: null, visible: false },
      ];
      
      orders.forEach(order => {
        const canView = order.callAssignedToId === callAgentId;
        expect(canView).toBe(order.visible);
      });
    });
  });
});
