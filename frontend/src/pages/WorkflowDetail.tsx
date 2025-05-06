import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../api';
import WorkflowStepSignoff from '../components/WorkflowStepSignoff';
import WorkflowTimeline from '../components/WorkflowTimeline';
import { useAuth } from '../contexts/AuthContext';

interface Attachment {
  id: number;
  file_name: string;
  description?: string;
}

interface WorkflowStep {
  id: number;
  step_number: number;
  signoff_person?: string;
  signoff_status: string;
  signoff_date?: string;
  remarks?: string;
}

interface Workflow {
  id: number;
  title: string;
  biller_integration_name: string;
  company_name: string;
  current_step: number;
  status: string;
  submit_date: string;
  attachments: Attachment[];
  steps: WorkflowStep[];
  
  // Additional workflow fields
  integration_type?: string;
  phone_number?: string;
  email?: string;
  fees_type?: string;
  fees_style?: string;
  mdr_fee?: number;
  fee_waive?: boolean;
  fee_waive_end_date?: string;
  agent_toggle?: boolean;
  agent_fee?: number;
  system_fee?: number;
  transaction_agent_fee?: number;
  dtr_fee?: number;
  business_owner?: string;
  requested_go_live_date?: string;
  setup_fee?: number;
  setup_fee_waive?: boolean;
  setup_fee_waive_end_date?: string;
  maintenance_fee?: number;
  maintenance_fee_waive?: boolean;
  maintenance_fee_waive_end_date?: string;
  portal_fee?: number;
  portal_fee_waive?: boolean;
  portal_fee_waive_end_date?: string;
  remarks?: string;
  logo_url?: string;
}

const STEP_LABELS = [
  '',
  'UAT Integration Setup',
  'UAT Testing and Demo',
  'Contract Negotiation',
  'Pre-Production Integration Setup',
  'Pre-Production QA Testing',
  'Pre-Production Finance Verification',
  'Production Deployment',
  'Go-Live Announcement',
];

// Define which roles can sign off each step
const STEP_TEAM_FLOW = [
  '',
  'Business Team → Integration', // Step 1: UAT Integration Setup
  'Integration → Business Team', // Step 2: UAT Testing and Demo
  'Business Team → Business Team',        // Step 3: Contract Negotiation
  'Business Team → Integration', // Step 4: Pre-Production Integration Setup
  'Integration → QA',  // Step 5: Pre-Production QA Testing
  'QA → Finance',      // Step 6: Pre-Production Finance Verification
  'Finance → Integration', // Step 7: Production Deployment
  'Integration → Business Team', // Step 8: Go-Live Announcement
];

export default function WorkflowDetail() {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Workflow>>({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { user } = useAuth();

  // Function to fetch workflow data
  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/workflows/${id}`);
      if (!res.ok) throw new Error('Failed to fetch workflow');
      const data = await res.json();
      setWorkflow(data);
      setEditFormData(data); // Initialize edit form with current data
      
      // After fetching workflow, also fetch history
      fetchWorkflowHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch workflow edit history
  const fetchWorkflowHistory = async () => {
    if (!id) return;
    
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_BASE}/workflows/${id}/history`);
      if (!res.ok) throw new Error('Failed to fetch workflow history');
      const data = await res.json();
      setEditHistory(data);
    } catch (e) {
      console.error('Error fetching workflow history:', e);
      // We don't need to show this error to the user, it's not critical
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Function to check if current user can edit this workflow
  const canEditWorkflow = (): boolean => {
    if (!workflow) return false;
    // Return true if user is from Business Team and workflow is in Contract Negotiation step (step 3)
    console.log('User role:', user?.role, 'Current step:', workflow.current_step);
    return user?.role === 'Business Team' && workflow.current_step === 3;
  };
  
  // Handle form field changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      setEditFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : parseFloat(value)
      }));
      return;
    }
    
    // Handle all other input types
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Function to update workflow data
  const handleUpdateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workflow || !canEditWorkflow()) return;
    
    try {
      setUpdateLoading(true);
      setUpdateError(null);
      setUpdateSuccess(false);
      
      // Include the current user's username in the update
      const updatedData = {
        ...editFormData,
        last_updated_by: user?.username || 'Unknown User'
      };
      
      const res = await fetch(`${API_BASE}/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });
      
      if (!res.ok) throw new Error('Failed to update workflow');
      
      // Refresh workflow data and history
      await fetchWorkflow();
      setIsEditing(false);
      setUpdateSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Load workflow data on component mount and after sign-offs
  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (error) return <div className="text-center text-red-600 py-12">{error}</div>;
  if (!workflow) return <div className="text-center py-12">Workflow not found.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-600 hover:underline">&larr; Back to Dashboard</Link>
        <div className="flex items-center space-x-3">
          {canEditWorkflow() && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center text-sm transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Workflow
            </button>
          )}
          {!isEditing && (
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center text-sm transition-colors">
              {showDetails ? "Hide Details" : "View Details"}
            </button>
          )}
          <span className={`px-3 py-1 rounded-full font-medium ${workflow.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {workflow.status}
          </span>
        </div>
      </div>
      
      {/* Removed Debug Info */}
      
      {/* Success Message */}
      {updateSuccess && (
        <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> Workflow details have been updated successfully.</span>
        </div>
      )}
      
      {/* Error Message */}
      {updateError && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {updateError}</span>
        </div>
      )}
      
      {isEditing ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h2 className="text-2xl font-bold">Edit Workflow Details</h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                disabled={updateLoading}>
                Cancel
              </button>
              <button 
                onClick={handleUpdateWorkflow}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors flex items-center"
                disabled={updateLoading}>
                {updateLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
          
          <form onSubmit={handleUpdateWorkflow} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Biller/Merchant Name</label>
                    <input
                      type="text"
                      name="biller_integration_name"
                      value={editFormData.biller_integration_name || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      name="company_name"
                      value={editFormData.company_name || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Integration Type</label>
                    <select
                      name="integration_type"
                      value={editFormData.integration_type || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded">
                      <option value="">Select Type</option>
                      <option value="API">API</option>
                      <option value="File Transfer">File Transfer</option>
                      <option value="Direct Integration">Direct Integration</option>
                      <option value="Payment Gateway">Payment Gateway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      name="phone_number"
                      value={editFormData.phone_number || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Owner</label>
                    <input
                      type="text"
                      name="business_owner"
                      value={editFormData.business_owner || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requested Go Live Date</label>
                    <input
                      type="date"
                      name="requested_go_live_date"
                      value={editFormData.requested_go_live_date || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                    <input
                      type="text"
                      name="logo_url"
                      value={editFormData.logo_url || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Fee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fees Type</label>
                    <select
                      name="fees_type"
                      value={editFormData.fees_type || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded">
                      <option value="">Select Type</option>
                      <option value="Fixed">Fixed</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fees Style</label>
                    <select
                      name="fees_style"
                      value={editFormData.fees_style || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded">
                      <option value="">Select Style</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MDR/Fee (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="mdr_fee"
                      value={editFormData.mdr_fee !== undefined ? editFormData.mdr_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="fee_waive"
                      name="fee_waive"
                      checked={editFormData.fee_waive || false}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="fee_waive" className="block text-sm font-medium text-gray-700">Fee Waiver</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Waiver End Date</label>
                    <input
                      type="date"
                      name="fee_waive_end_date"
                      value={editFormData.fee_waive_end_date || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      disabled={!editFormData.fee_waive}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="agent_toggle"
                      name="agent_toggle"
                      checked={editFormData.agent_toggle || false}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="agent_toggle" className="block text-sm font-medium text-gray-700">Agent Fee Enabled</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="agent_fee"
                      value={editFormData.agent_fee !== undefined ? editFormData.agent_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      disabled={!editFormData.agent_toggle}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Fees */}
              <div>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Additional Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="system_fee"
                      value={editFormData.system_fee !== undefined ? editFormData.system_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Agent Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="transaction_agent_fee"
                      value={editFormData.transaction_agent_fee !== undefined ? editFormData.transaction_agent_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DTR Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="dtr_fee"
                      value={editFormData.dtr_fee !== undefined ? editFormData.dtr_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Setup Fees */}
              <div>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Setup Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setup Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="setup_fee"
                      value={editFormData.setup_fee !== undefined ? editFormData.setup_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="setup_fee_waive"
                      name="setup_fee_waive"
                      checked={editFormData.setup_fee_waive || false}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="setup_fee_waive" className="block text-sm font-medium text-gray-700">Setup Fee Waiver</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setup Fee Waiver End Date</label>
                    <input
                      type="date"
                      name="setup_fee_waive_end_date"
                      value={editFormData.setup_fee_waive_end_date || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      disabled={!editFormData.setup_fee_waive}
                    />
                  </div>
                </div>
              </div>

              {/* Maintenance Fees */}
              <div>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Maintenance Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="maintenance_fee"
                      value={editFormData.maintenance_fee !== undefined ? editFormData.maintenance_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintenance_fee_waive"
                      name="maintenance_fee_waive"
                      checked={editFormData.maintenance_fee_waive || false}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="maintenance_fee_waive" className="block text-sm font-medium text-gray-700">Maintenance Fee Waiver</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Fee Waiver End Date</label>
                    <input
                      type="date"
                      name="maintenance_fee_waive_end_date"
                      value={editFormData.maintenance_fee_waive_end_date || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      disabled={!editFormData.maintenance_fee_waive}
                    />
                  </div>
                </div>
              </div>

              {/* Portal Fees */}
              <div>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Portal Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Portal Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="portal_fee"
                      value={editFormData.portal_fee !== undefined ? editFormData.portal_fee : ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="portal_fee_waive"
                      name="portal_fee_waive"
                      checked={editFormData.portal_fee_waive || false}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="portal_fee_waive" className="block text-sm font-medium text-gray-700">Portal Fee Waiver</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Portal Fee Waiver End Date</label>
                    <input
                      type="date"
                      name="portal_fee_waive_end_date"
                      value={editFormData.portal_fee_waive_end_date || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      disabled={!editFormData.portal_fee_waive}
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Additional Notes</h3>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    name="remarks"
                    rows={4}
                    value={editFormData.remarks || ''}
                    onChange={handleFormChange}
                    className="w-full p-2 border border-gray-300 rounded">
                  </textarea>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6 border-b pb-3">{workflow.title}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Workflow Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Biller/Merchant:</span>
                  <span className="font-medium">{workflow.biller_integration_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Company:</span>
                  <span className="font-medium">{workflow.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{workflow.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Started:</span>
                  <span className="font-medium">{new Date(workflow.submit_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Current Step Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">Current Step</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex flex-col">
                  <span className="text-gray-600">Step Number:</span>
                  <span className="font-medium text-blue-800 text-lg">{workflow.current_step}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-600">Step Name:</span>
                  <span className="font-medium text-blue-800">{STEP_LABELS[workflow.current_step] || `Step ${workflow.current_step}`}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-600">Team Flow:</span>
                  <span className="font-medium text-blue-700">{STEP_TEAM_FLOW[workflow.current_step]}</span>
                </div>
              </div>
            </div>
            
            {/* Attachments Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">Attachments</h3>
              {workflow.attachments && workflow.attachments.length > 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  {workflow.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <a 
                        href={`${API_BASE}/attachments/${attachment.id}`} 
                        className="text-blue-600 hover:underline text-sm truncate"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={attachment.file_name}
                      >
                        {attachment.file_name}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <span className="text-gray-500 italic">No attachments available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Detailed Workflow Information */}
      {showDetails && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 transition-all">
          <h3 className="text-xl font-bold mb-6 border-b pb-3">Detailed Workflow Information</h3>
          
          <div className="space-y-8">
            {/* Basic Information */}
            <div>
              <h4 className="font-semibold text-lg mb-3 border-b pb-2">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Workflow ID:</span>
                  <span className="font-medium">{workflow.id}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Biller/Merchant Name:</span>
                  <span className="font-medium">{workflow.biller_integration_name}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Company Name:</span>
                  <span className="font-medium">{workflow.company_name}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Integration Type:</span>
                  <span className="font-medium">{workflow.integration_type || 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Email:</span>
                  <span className="font-medium">{workflow.email || 'Not provided'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Phone Number:</span>
                  <span className="font-medium">{workflow.phone_number || 'Not provided'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Business Owner:</span>
                  <span className="font-medium">{workflow.business_owner || 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Requested Go Live Date:</span>
                  <span className="font-medium">{workflow.requested_go_live_date ? new Date(workflow.requested_go_live_date).toLocaleDateString() : 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            {/* Fee Information */}
            <div>
              <h4 className="font-semibold text-lg mb-3 border-b pb-2">Fee Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Fees Type:</span>
                  <span className="font-medium">{workflow.fees_type || 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Fees Style:</span>
                  <span className="font-medium">{workflow.fees_style || 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">MDR/Fee:</span>
                  <span className="font-medium">{workflow.mdr_fee !== undefined ? workflow.mdr_fee : 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Fee Waiver:</span>
                  <span className="font-medium">{workflow.fee_waive ? 'Yes' : 'No'}</span>
                </div>
                {workflow.fee_waive && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <span className="text-gray-600 block">Fee Waiver End Date:</span>
                    <span className="font-medium">{workflow.fee_waive_end_date ? new Date(workflow.fee_waive_end_date).toLocaleDateString() : 'Not specified'}</span>
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Agent Fee Enabled:</span>
                  <span className="font-medium">{workflow.agent_toggle ? 'Yes' : 'No'}</span>
                </div>
                {workflow.agent_toggle && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <span className="text-gray-600 block">Agent Fee:</span>
                    <span className="font-medium">{workflow.agent_fee !== undefined ? workflow.agent_fee : 'Not specified'}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional Fees */}
            <div>
              <h4 className="font-semibold text-lg mb-3 border-b pb-2">Additional Fees</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">System Fee:</span>
                  <span className="font-medium">{workflow.system_fee !== undefined ? workflow.system_fee : 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Transaction Agent Fee:</span>
                  <span className="font-medium">{workflow.transaction_agent_fee !== undefined ? workflow.transaction_agent_fee : 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">DTR Fee:</span>
                  <span className="font-medium">{workflow.dtr_fee !== undefined ? workflow.dtr_fee : 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            {/* Setup Fees */}
            <div>
              <h4 className="font-semibold text-lg mb-3 border-b pb-2">Setup Fees</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Setup Fee:</span>
                  <span className="font-medium">{workflow.setup_fee !== undefined ? workflow.setup_fee : 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Setup Fee Waiver:</span>
                  <span className="font-medium">{workflow.setup_fee_waive ? 'Yes' : 'No'}</span>
                </div>
                {workflow.setup_fee_waive && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <span className="text-gray-600 block">Setup Fee Waiver End Date:</span>
                    <span className="font-medium">{workflow.setup_fee_waive_end_date ? new Date(workflow.setup_fee_waive_end_date).toLocaleDateString() : 'Not specified'}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Maintenance Fees */}
            <div>
              <h4 className="font-semibold text-lg mb-3 border-b pb-2">Maintenance Fees</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Maintenance Fee:</span>
                  <span className="font-medium">{workflow.maintenance_fee !== undefined ? workflow.maintenance_fee : 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Maintenance Fee Waiver:</span>
                  <span className="font-medium">{workflow.maintenance_fee_waive ? 'Yes' : 'No'}</span>
                </div>
                {workflow.maintenance_fee_waive && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <span className="text-gray-600 block">Maintenance Fee Waiver End Date:</span>
                    <span className="font-medium">{workflow.maintenance_fee_waive_end_date ? new Date(workflow.maintenance_fee_waive_end_date).toLocaleDateString() : 'Not specified'}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Portal Fees */}
            <div>
              <h4 className="font-semibold text-lg mb-3 border-b pb-2">Portal Fees</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Portal Fee:</span>
                  <span className="font-medium">{workflow.portal_fee !== undefined ? workflow.portal_fee : 'Not specified'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-600 block">Portal Fee Waiver:</span>
                  <span className="font-medium">{workflow.portal_fee_waive ? 'Yes' : 'No'}</span>
                </div>
                {workflow.portal_fee_waive && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <span className="text-gray-600 block">Portal Fee Waiver End Date:</span>
                    <span className="font-medium">{workflow.portal_fee_waive_end_date ? new Date(workflow.portal_fee_waive_end_date).toLocaleDateString() : 'Not specified'}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Attachments */}
            <div>
              <h4 className="font-semibold text-lg mb-3 border-b pb-2">Attachments</h4>
              {workflow.attachments && workflow.attachments.length > 0 ? (
                <div className="space-y-2">
                  {workflow.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{attachment.file_name}</span>
                      </div>
                      <a 
                        href={`${API_BASE}/attachments/${attachment.id}`} 
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No attachments available</div>
              )}
            </div>
            
            {/* Remarks */}
            {workflow.remarks && (
              <div>
                <h4 className="font-semibold text-lg mb-3 border-b pb-2">Remarks</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="whitespace-pre-line">{workflow.remarks}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow Timeline */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold mb-6 border-b pb-3">Workflow Progress</h3>
        <div className="overflow-x-auto pb-4">
          <div className="min-w-max">
            <WorkflowTimeline 
              steps={workflow.steps} 
              currentStep={workflow.current_step} 
              stepLabels={STEP_LABELS} 
              stepTeamFlow={STEP_TEAM_FLOW} 
            />
          </div>
        </div>
      </div>

      {/* Workflow Edit History */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4 border-b pb-3 cursor-pointer" 
             onClick={() => setShowHistory(!showHistory)}>
          <h3 className="text-xl font-bold">Update History</h3>
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${showHistory ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        
        {showHistory && (
          <div className="mt-4">
            {historyLoading ? (
              <div className="text-center py-4">Loading history...</div>
            ) : editHistory.length === 0 ? (
              <div className="text-gray-500 italic py-4 text-center">No update history available</div>
            ) : (
              <div className="space-y-4">
                {editHistory.map((entry, index) => (
                  <div key={entry.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between mb-3">
                      <span className="font-medium">
                        Updated by <span className="text-blue-600">{entry.edited_by}</span>
                      </span>
                      <span className="text-gray-500 text-sm">
                        {new Date(entry.edited_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(entry.changes).map(([field, change]: [string, any]) => (
                        <div key={field} className="grid grid-cols-3 gap-2 text-sm">
                          <div className="font-medium">{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                          <div className="text-red-500 line-through">{change.old_value || '-'}</div>
                          <div className="text-green-600">{change.new_value || '-'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {workflow.status !== 'Done' && (
        <div className="mt-6">
          <h3 className="font-semibold mb-4">Current Step Sign-off</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-blue-800">
              <span className="font-medium">Current step: </span>
              {workflow.current_step}. {STEP_LABELS[workflow.current_step]}
            </p>
            <p className="text-blue-700 text-sm mt-1">
              <span className="font-medium">Team flow: </span>
              {STEP_TEAM_FLOW[workflow.current_step]}
            </p>
          </div>
          
          {workflow.steps.length >= workflow.current_step && (
            <WorkflowStepSignoff
              workflowId={workflow.id}
              stepNumber={workflow.current_step}
              currentStatus={workflow.steps[workflow.current_step - 1]?.signoff_status || 'Pending'}
              onSignoffComplete={fetchWorkflow}
            />
          )}
        </div>
      )}
    </div>
  );
}
