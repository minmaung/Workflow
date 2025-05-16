import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../api';
import { useNavigate, Link } from 'react-router-dom';

// Interface for custom fields
interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'dropdown';
  options?: string[];
  required: boolean;
}

// Interface for file attachment
interface FileAttachment extends File {
  description?: string;
}

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
  custom_fields: [] as CustomField[], // For storing dynamic field definitions for biller forms
  report_fields: [] as string[], // For storing field names that billers want to see in transaction reports
};

export default function CreateWorkflow() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [reportField, setReportField] = useState<string>('');
  const [reportFields, setReportFields] = useState<string[]>([]);
  const navigate = useNavigate();

  // Function to handle form input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }

  // Add a report field
  function addReportField() {
    if (!reportField.trim()) return;
    
    setReportFields([...reportFields, reportField.trim()]);
    setReportField('');
  }
  
  // Remove a report field
  function removeReportField(index: number) {
    const updatedFields = [...reportFields];
    updatedFields.splice(index, 1);
    setReportFields(updatedFields);
  }

  // Generate unique ID for custom fields
  function generateFieldId() {
    return `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  
  // Add a new custom field
  function addCustomField() {
    const newField: CustomField = {
      id: generateFieldId(),
      name: '',
      type: 'text',
      required: false,
      options: []
    };
    setCustomFields([...customFields, newField]);
  }
  
  // Update a custom field
  function updateCustomField(id: string, updates: Partial<CustomField>) {
    setCustomFields(customFields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  }
  
  // Remove a custom field
  function removeCustomField(id: string) {
    setCustomFields(customFields.filter(field => field.id !== id));
  }

  // Submit the form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Prepare the form data to include custom fields and report fields
      const formData = {
        ...form,
        custom_fields: customFields,
        report_fields: reportFields
      };
      
      console.log('Submitting workflow data:', formData);
      
      // Make the actual API call to create the workflow
      const response = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Workflow created successfully:', result);
      
      // Navigate back to the dashboard to see the new workflow
      navigate('/');
    } catch (err) {
      console.error('Error creating workflow:', err);
      setError(`An error occurred: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  // Show custom fields section based on integration type
  const showCustomFieldsSection = form.integration_type === 'Online Biller' || form.integration_type === 'Offline Biller';

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Create New Workflow</h1>
                <p className="mt-2 text-blue-100 dark:text-blue-200">Define a new integration workflow with a biller</p>
              </div>
              <Link 
                to="/" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors dark:text-blue-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-blue-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to list
              </Link>
            </div>
          </div>

          <div className="p-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 mb-6 rounded-md shadow-sm" role="alert">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}
          
            {/* Basic Information Section */}
            <div className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Basic Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Biller Integration Name</label>
                      <input
                        type="text"
                        name="biller_integration_name"
                        value={form.biller_integration_name}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select a category</option>
                        <option value="Banking">Banking</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Telco">Telecommunications</option>
                        <option value="Government">Government</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Integration Type</label>
                      <select
                        name="integration_type"
                        value={form.integration_type}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select integration type</option>
                        <option value="Online Biller">Online Biller</option>
                        <option value="Offline Biller">Offline Biller</option>
                        <option value="API">API</option>
                        <option value="File Transfer">File Transfer</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                      <input
                        type="text"
                        name="company_name"
                        value={form.company_name}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={form.phone_number}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Owner</label>
                      <input
                        type="text"
                        name="business_owner"
                        value={form.business_owner}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Fee Structure Section */}
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Fee Structure
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fees Type</label>
                  <select
                    name="fees_type"
                    value={form.fees_type}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select fee type</option>
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                    <option value="Tiered">Tiered</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fees Style</label>
                  <select
                    name="fees_style"
                    value={form.fees_style}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select fee style</option>
                    <option value="Debit Fee">Debit Fee</option>
                    <option value="Credit Fee">Credit Fee</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">MDR Fee (%)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="mdr_fee"
                      value={form.mdr_fee}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                {/* Waive Fee Section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="fee_waive"
                      name="fee_waive"
                      checked={form.fee_waive}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="fee_waive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Waive Fee
                    </label>
                  </div>
                  
                  {form.fee_waive && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Waive End Date</label>
                      <input
                        type="date"
                        name="fee_waive_end_date"
                        value={form.fee_waive_end_date}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
                
                {/* Enable Agent Section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="agent_toggle"
                      name="agent_toggle"
                      checked={form.agent_toggle}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agent_toggle" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Enable Agent
                    </label>
                  </div>
                </div>
                
                {/* Agent Fee Section - Only visible when agent_toggle is true */}
                {form.agent_toggle && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Agent App Fees Distribution</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Agent Fee */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Fee</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="agent_fee"
                            value={form.agent_fee}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      {/* System Fee */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Fee</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="system_fee"
                            value={form.system_fee}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      {/* Transaction Agent Fee */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Agent Fee</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="transaction_agent_fee"
                            value={form.transaction_agent_fee}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      {/* DTR Fee */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">DTR Fee</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="dtr_fee"
                            value={form.dtr_fee}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Fees Section */}
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Additional Fees
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Setup Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Setup Fee</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="setup_fee"
                      value={form.setup_fee}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      id="setup_fee_waive"
                      name="setup_fee_waive"
                      checked={form.setup_fee_waive}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="setup_fee_waive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Waive Setup Fee
                    </label>
                  </div>
                  {form.setup_fee_waive && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waive Until</label>
                      <input
                        type="date"
                        name="setup_fee_waive_end_date"
                        value={form.setup_fee_waive_end_date}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
                
                {/* Maintenance Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maintenance Fee</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="maintenance_fee"
                      value={form.maintenance_fee}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      id="maintenance_fee_waive"
                      name="maintenance_fee_waive"
                      checked={form.maintenance_fee_waive}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenance_fee_waive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Waive Maintenance Fee
                    </label>
                  </div>
                  {form.maintenance_fee_waive && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waive Until</label>
                      <input
                        type="date"
                        name="maintenance_fee_waive_end_date"
                        value={form.maintenance_fee_waive_end_date}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
                
                {/* Portal Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portal Fee</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="portal_fee"
                      value={form.portal_fee}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      id="portal_fee_waive"
                      name="portal_fee_waive"
                      checked={form.portal_fee_waive}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="portal_fee_waive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Waive Portal Fee
                    </label>
                  </div>
                  {form.portal_fee_waive && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waive Until</label>
                      <input
                        type="date"
                        name="portal_fee_waive_end_date"
                        value={form.portal_fee_waive_end_date}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Implementation Details Section */}
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Implementation Details
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requested By</label>
                  <input
                    type="text"
                    name="requested_by"
                    value={form.requested_by}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requested Go Live Date</label>
                  <input
                    type="date"
                    name="requested_go_live_date"
                    value={form.requested_go_live_date}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                

                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                  <textarea
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes or comments about this workflow..."
                  />
                </div>
              </div>
            </div>



            {/* Custom Fields Section - Only shown for Online/Offline Biller types */}
            {showCustomFieldsSection && (
              <div className="border-t pt-6 border-gray-200 dark:border-gray-700 mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                  <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Custom Fields for Biller Form
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Note:</span> Define custom fields that will be included in the biller form. These fields will be dynamically generated based on the biller's requirements.
                </p>
                
                <button
                  type="button"
                  onClick={addCustomField}
                  className="mb-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Custom Field
                </button>

                {customFields.map((field, index) => (
                  <div key={field.id} className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                    <div className="flex justify-between mb-2">
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Field #{index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field Name</label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter field name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => updateCustomField(field.id, { type: e.target.value as 'text' | 'number' | 'dropdown' })}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        id={`required-${field.id}`}
                        checked={field.required}
                        onChange={(e) => updateCustomField(field.id, { required: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`required-${field.id}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Required Field
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Report Fields Section - Only shown for Online/Offline Biller types */}
            {showCustomFieldsSection && (
              <div className="border-t pt-6 border-gray-200 dark:border-gray-700 mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                  <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Report Fields
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Note:</span> Define the field names that billers want to see in their transaction reports. These field names will be used when generating transaction reports.
                </p>
                
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {reportFields.map((field, index) => (
                      <div key={index} className="flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{field}</span>
                        <button
                          type="button"
                          onClick={() => removeReportField(index)}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex">
                    <input
                      type="text"
                      value={reportField}
                      onChange={(e) => setReportField(e.target.value)}
                      className="flex-1 rounded-l-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter field name"
                    />
                    <button
                      type="button"
                      onClick={addReportField}
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 flex items-center"
                    >
                      <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
              <div className="flex justify-end items-center gap-3">
                <Link
                  to="/"
                  className="inline-flex justify-center py-2.5 px-5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors duration-150"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center py-2.5 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : 'Create Workflow'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
