import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api';

// Define which team can sign off on each step
const STEP_PERMISSIONS: Record<number, string[]> = {
  1: ['Integration'],      // UAT Integration Setup: Business Team -> Integration
  2: ['Business Team'],    // UAT Testing and Demo: Integration -> Business Team
  3: ['Business Team'],    // Contract Negotiation: Business Team -> Business Team
  4: ['Integration'],      // Pre-Production Integration Setup: Business Team -> Integration
  5: ['QA'],               // Pre-Production QA Testing: Integration -> QA
  6: ['Finance'],          // Pre-Production Finance Verification: QA -> Finance
  7: ['Integration'],      // Production Deployment: Finance -> Integration
  8: ['Business Team'],    // Go-Live Announcement: Integration -> Business Team
};

// Step names for reference
const STEP_NAMES: Record<number, string> = {
  1: 'UAT Integration Setup',
  2: 'UAT Testing and Demo',
  3: 'Contract Negotiation',
  4: 'Pre-Production Integration Setup',
  5: 'Pre-Production QA Testing',
  6: 'Pre-Production Finance Verification',
  7: 'Production Deployment',
  8: 'Go-Live Announcement',
};

type WorkflowStepSignoffProps = {
  workflowId: number;
  stepNumber: number;
  currentStatus: string;
  onSignoffComplete: () => void;
};

export default function WorkflowStepSignoff({
  workflowId,
  stepNumber,
  currentStatus,
  onSignoffComplete
}: WorkflowStepSignoffProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'Approved' | 'Rejected'>('Approved');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if the current user has permission to sign off this step
  const canSignoff = user && STEP_PERMISSIONS[stepNumber]?.includes(user.role);
  
  // Get the step name for display
  const stepName = STEP_NAMES[stepNumber] || `Step ${stepNumber}`;
  
  // Handle the signoff submission
  async function handleSignoff(e: React.FormEvent) {
    e.preventDefault();
    if (!canSignoff || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/workflows/${workflowId}/steps/${stepNumber}/signoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signoff_person: user.username,
          signoff_status: status,
          remarks: remarks,
          // signoff_date will be set by the server
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to sign off on this step');
      }
      
      // Call the callback to refresh the workflow details
      onSignoffComplete();
    } catch (err: any) {
      console.error('Sign-off error:', err);
      setError(err.message || 'An error occurred during sign-off');
    } finally {
      setLoading(false);
    }
  }
  
  // If step is already approved or rejected, just show the status
  if (currentStatus === 'Approved' || currentStatus === 'Rejected') {
    return (
      <div className="border rounded p-4 bg-gray-50">
        <h3 className="font-medium text-lg mb-2">{stepName}</h3>
        <div className={`inline-block px-2 py-1 rounded text-sm font-medium ${
          currentStatus === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {currentStatus}
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded p-4 bg-gray-50">
      <h3 className="font-medium text-lg mb-2">{stepName}</h3>
      
      {canSignoff ? (
        <>
          <form onSubmit={handleSignoff} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Approved' | 'Rejected')}
                className="w-full p-2 border border-gray-300 rounded"
                disabled={loading}
              >
                <option value="Approved">Approve</option>
                <option value="Rejected">Reject</option>
              </select>
            </div>
            
            <div>
              <label className="block font-medium mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                rows={3}
                disabled={loading}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Signoff'}
              </button>
            </div>
            
            {error && (
              <div className="text-red-600 text-sm mt-2">{error}</div>
            )}
          </form>
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          <p>Only <strong>{STEP_PERMISSIONS[stepNumber]?.join(', ')}</strong> team can sign off on this step.</p>
          {user && <p className="mt-1">Your current role: <strong>{user.role}</strong></p>}
        </div>
      )}
    </div>
  );
}
