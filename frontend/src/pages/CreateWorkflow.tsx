import React, { useState, useRef } from 'react';
import { API_BASE } from '../api';
import { useNavigate } from 'react-router-dom';

const initialForm = {
  // title field will be auto-generated on the server side as WF00001 format
  biller_integration_name: '',
  category: '',
  integration_type: '',
  company_name: '',
  phone_number: '',
  email: '',
  fees_type: '',
  fees_style: '',
  mdr_fee: 0, // Changed to number
  fee_waive: false,
  fee_waive_end_date: new Date().toISOString().split('T')[0], // Default to today
  agent_toggle: false,
  agent_fee: 0, // Changed to number
  system_fee: 0, // Changed to number
  transaction_agent_fee: 0, // Changed to number
  dtr_fee: 0, // Changed to number
  business_owner: '',
  requested_go_live_date: new Date().toISOString().split('T')[0], // Default to today
  setup_fee: 0, // Changed to number
  setup_fee_waive: false,
  setup_fee_waive_end_date: new Date().toISOString().split('T')[0], // Default to today
  maintenance_fee: 0, // Changed to number
  maintenance_fee_waive: false,
  maintenance_fee_waive_end_date: new Date().toISOString().split('T')[0], // Default to today
  portal_fee: 0, // Changed to number
  portal_fee_waive: false,
  portal_fee_waive_end_date: new Date().toISOString().split('T')[0], // Default to today
  requested_by: '',
  remarks: '',
  last_updated_by: '',
  go_live_date: new Date().toISOString().split('T')[0], // Default to today
};

export default function CreateWorkflow() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentDescriptions, setAttachmentDescriptions] = useState<{[key: string]: string}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      // Convert number inputs to actual numbers
      setForm(f => ({ ...f, [name]: parseFloat(value) || 0 }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }


  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...fileList]);
      
      // Initialize descriptions for new files
      const newDescriptions = {...attachmentDescriptions};
      fileList.forEach(file => {
        newDescriptions[file.name] = '';
      });
      setAttachmentDescriptions(newDescriptions);
    }
  }

  function handleRemoveFile(fileName: string) {
    setAttachments(prev => prev.filter(file => file.name !== fileName));
    
    // Remove description
    const newDescriptions = {...attachmentDescriptions};
    delete newDescriptions[fileName];
    setAttachmentDescriptions(newDescriptions);
  }

  function handleDescriptionChange(fileName: string, description: string) {
    setAttachmentDescriptions(prev => ({
      ...prev,
      [fileName]: description
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      
      // Prepare data with proper types
      const preparedData = {
        ...form,
        // Ensure numeric fields are numbers
        mdr_fee: parseFloat(form.mdr_fee.toString()) || 0,
        agent_fee: parseFloat(form.agent_fee.toString()) || 0,
        system_fee: parseFloat(form.system_fee.toString()) || 0,
        transaction_agent_fee: parseFloat(form.transaction_agent_fee.toString()) || 0,
        dtr_fee: parseFloat(form.dtr_fee.toString()) || 0,
        setup_fee: parseFloat(form.setup_fee.toString()) || 0,
        maintenance_fee: parseFloat(form.maintenance_fee.toString()) || 0,
        portal_fee: parseFloat(form.portal_fee.toString()) || 0,
      };
      
      console.log('Submitting workflow:', preparedData);
      
      const res = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preparedData),
      });
      
      if (!res.ok) {
        // Try to parse the error response as JSON
        const errorText = await res.text();
        let errorMessage = 'Failed to create workflow';
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : JSON.stringify(errorData.detail);
          }
        } catch (parseError) {
          // If JSON parsing fails, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const createdWorkflow = await res.json();
      
      // If there are attachments, upload them
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          
          // Add description if available
          if (attachmentDescriptions[file.name]) {
            formData.append('description', attachmentDescriptions[file.name]);
          }
          
          try {
            await fetch(`${API_BASE}/workflows/${createdWorkflow.id}/attachments`, {
              method: 'POST',
              body: formData,
            });
          } catch (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            // We continue even if one attachment fails
          }
        }
      }
      
      navigate('/');
    } catch (e: any) {
      console.error('Error creating workflow:', e);
      // Make sure we display a proper error message, not [object Object]
      const errorMessage = e.message || 'An unknown error occurred';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Create New Workflow (UAT Request)</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Workflow ID</label>
            <div className="input bg-gray-100 text-gray-600">[Auto-generated as WF00001 format]</div>
          </div>
          <div>
            <label className="block font-medium">Biller/Integration Name</label>
            <input name="biller_integration_name" value={form.biller_integration_name} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block font-medium">Category</label>
            <input name="category" value={form.category} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="block font-medium">Integration Type</label>
            <select name="integration_type" value={form.integration_type} onChange={handleChange} className="input" required>
              <option value="">Select</option>
              <option value="Online Merchant">Online Merchant</option>
              <option value="Online Biller">Online Biller</option>
              <option value="Offline Biller">Offline Biller</option>
            </select>
          </div>
          <div>
            <label className="block font-medium">Company Name</label>
            <input name="company_name" value={form.company_name} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="block font-medium">Phone Number</label>
            <input name="phone_number" value={form.phone_number} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="block font-medium">Email</label>
            <input name="email" value={form.email} onChange={handleChange} className="input" type="email" />
          </div>
          <div>
            <label className="block font-medium">Fees Type</label>
            <select name="fees_type" value={form.fees_type} onChange={handleChange} className="input" required>
              <option value="">Select</option>
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
          <div>
            <label className="block font-medium">Fees Style</label>
            <select name="fees_style" value={form.fees_style} onChange={handleChange} className="input" required>
              <option value="">Select</option>
              <option value="Flat">Flat</option>
              <option value="Percent">Percent</option>
            </select>
          </div>
          <div>
            <label className="block font-medium">MDR Fee</label>
            <input name="mdr_fee" value={form.mdr_fee} onChange={handleChange} className="input" type="number" step="0.01" min="0" required />
          </div>
          {/* Fee Waive Section */}
          <div className="col-span-2 mt-4 mb-2 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-700">Fee Waiver Settings</h3>
          </div>
          
          <div className="bg-gray-50 p-3 rounded col-span-2 mb-2">
            <div className="flex items-center mb-2">
              <input 
                name="fee_waive" 
                checked={form.fee_waive} 
                onChange={handleChange} 
                className="mr-2 h-4 w-4" 
                type="checkbox" 
                id="fee_waive"
              />
              <label htmlFor="fee_waive" className="font-medium">Enable Fee Waiver</label>
            </div>
            
            {form.fee_waive && (
              <div className="ml-6 p-3 bg-white rounded border border-gray-200">
                <label className="block font-medium text-sm mb-1">Fee Waive End Date</label>
                <input 
                  name="fee_waive_end_date" 
                  value={form.fee_waive_end_date} 
                  onChange={handleChange} 
                  className="input" 
                  type="date" 
                  required 
                />
              </div>
            )}
          </div>
          
          {/* Agent Toggle Section */}
          <div className="col-span-2 mt-4 mb-2 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-700">Agent Fee Settings</h3>
          </div>
          
          <div className="bg-gray-50 p-3 rounded col-span-2 mb-2">
            <div className="flex items-center mb-2">
              <input 
                name="agent_toggle" 
                checked={form.agent_toggle} 
                onChange={handleChange} 
                className="mr-2 h-4 w-4" 
                type="checkbox" 
                id="agent_toggle"
              />
              <label htmlFor="agent_toggle" className="font-medium">Enable Agent Fees</label>
            </div>
            
            {form.agent_toggle && (
              <div className="ml-6 p-3 bg-white rounded border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-sm mb-1">Agent Fee</label>
                  <input 
                    name="agent_fee" 
                    value={form.agent_fee} 
                    onChange={handleChange} 
                    className="input" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                  />
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">System Fee</label>
                  <input 
                    name="system_fee" 
                    value={form.system_fee} 
                    onChange={handleChange} 
                    className="input" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                  />
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">Transaction Agent Fee</label>
                  <input 
                    name="transaction_agent_fee" 
                    value={form.transaction_agent_fee} 
                    onChange={handleChange} 
                    className="input" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                  />
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">DTR Fee</label>
                  <input 
                    name="dtr_fee" 
                    value={form.dtr_fee} 
                    onChange={handleChange} 
                    className="input" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block font-medium">Business Owner</label>
            <input name="business_owner" value={form.business_owner} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block font-medium">Requested Go Live Date</label>
            <input name="requested_go_live_date" value={form.requested_go_live_date} onChange={handleChange} className="input" type="date" required />
          </div>
          <div>
            <label className="block font-medium">Setup Fee</label>
            <input name="setup_fee" value={form.setup_fee} onChange={handleChange} className="input" type="number" step="0.01" min="0" required />
          </div>
          <div>
            <label className="block font-medium">Requested By</label>
            <input name="requested_by" value={form.requested_by} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block font-medium">Last Updated By</label>
            <input name="last_updated_by" value={form.last_updated_by} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block font-medium">Go Live Date</label>
            <input name="go_live_date" value={form.go_live_date} onChange={handleChange} className="input" type="date" required />
          </div>
        </div>
        <div>
          <label className="block font-medium">Remarks</label>
          <textarea name="remarks" value={form.remarks} onChange={handleChange} className="input" />
        </div>
        
        {/* File Attachments Section */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Attachments</h3>
          <div className="mb-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Add Attachments
            </button>
          </div>
          
          {/* List of attached files */}
          {attachments.length > 0 && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-sm font-medium mb-2">Files to upload:</h4>
              <ul className="space-y-2">
                {attachments.map((file) => (
                  <li key={file.name} className="flex flex-col p-2 bg-white rounded shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={attachmentDescriptions[file.name] || ''}
                        onChange={(e) => handleDescriptionChange(file.name, e.target.value)}
                        className="w-full text-sm p-1 border border-gray-300 rounded"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Create Workflow'}</button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </form>
    </div>
  );
}

