import React, { useState, useRef, useEffect } from 'react';
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
  custom_fields: [], // For storing dynamic field definitions for biller forms
  report_fields: [], // For storing field names that billers want to see in transaction reports
};

// Interface for custom fields
interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'dropdown';
  options?: string[];
  required: boolean;
}

export default function CreateWorkflow() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentDescriptions, setAttachmentDescriptions] = useState<{[key: string]: string}>({});
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [showReportFields, setShowReportFields] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [reportFields, setReportFields] = useState<string[]>([]);
  const [newReportField, setNewReportField] = useState<string>('');
  const [newOption, setNewOption] = useState<{ fieldId: string, option: string }>({ fieldId: '', option: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  // Check if custom fields and report fields sections should be visible based on integration type
  useEffect(() => {
    const isBiller = form.integration_type === 'Online Biller' || form.integration_type === 'Offline Biller';
    setShowCustomFields(isBiller);
    setShowReportFields(isBiller);
  }, [form.integration_type]);

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
  
  // Add option to dropdown field
  function addOption(fieldId: string) {
    if (!newOption.option.trim()) return;
    
    setCustomFields(customFields.map(field => {
      if (field.id === fieldId) {
        const updatedOptions = [...(field.options || []), newOption.option.trim()];
        return { ...field, options: updatedOptions };
      }
      return field;
    }));
    
    setNewOption({ fieldId: '', option: '' });
  }
  
  // Remove option from dropdown field
  function removeOption(fieldId: string, optionIndex: number) {
    setCustomFields(customFields.map(field => {
      if (field.id === fieldId && field.options) {
        const updatedOptions = [...field.options];
        updatedOptions.splice(optionIndex, 1);
        return { ...field, options: updatedOptions };
      }
      return field;
    }));
  }
  
  // Add a report field
  function addReportField() {
    if (!newReportField.trim()) return;
    setReportFields([...reportFields, newReportField.trim()]);
    setNewReportField('');
  }
  
  // Remove a report field
  function removeReportField(index: number) {
    const updatedFields = [...reportFields];
    updatedFields.splice(index, 1);
    setReportFields(updatedFields);
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
      // Validate custom fields if applicable
      if (showCustomFields) {
        // Check if any custom fields have empty names
        const hasEmptyNames = customFields.some(field => !field.name.trim());
        if (hasEmptyNames) {
          throw new Error('All custom fields must have names');
        }
        
        // Check if any dropdown fields have no options
        const hasDropdownWithoutOptions = customFields.some(field => 
          field.type === 'dropdown' && (!field.options || field.options.length === 0)
        );
        if (hasDropdownWithoutOptions) {
          throw new Error('All dropdown fields must have at least one option');
        }
      }
      
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
        // Add custom fields if applicable
        custom_fields: showCustomFields ? customFields : [],
        // Add report fields if applicable
        report_fields: showReportFields ? reportFields : [],
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
        
        {/* Custom Fields Builder - Only shown for Online/Offline Biller */}
        {showCustomFields && (
          <div className="mt-6 mb-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Custom Biller Form Fields</h3>
            <p className="text-sm text-gray-600 mb-4">
              Define the fields that will appear on the Biller's form for this integration.
            </p>
            
            {customFields.length > 0 && (
              <div className="space-y-6 mb-4">
                {customFields.map((field) => (
                  <div key={field.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Field Definition</h4>
                      <button 
                        type="button" 
                        onClick={() => removeCustomField(field.id)} 
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Field
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Field Name */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Field Name</label>
                        <input 
                          type="text" 
                          value={field.name} 
                          onChange={(e) => updateCustomField(field.id, { name: e.target.value })} 
                          className="input" 
                          placeholder="e.g. Merchant ID"
                        />
                      </div>
                      
                      {/* Field Type */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Field Type</label>
                        <select 
                          value={field.type} 
                          onChange={(e) => updateCustomField(field.id, { 
                            type: e.target.value as 'text' | 'number' | 'dropdown' 
                          })} 
                          className="input"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                      </div>
                      
                      {/* Required Field */}
                      <div className="flex items-center pt-6">
                        <input 
                          type="checkbox" 
                          id={`required-${field.id}`} 
                          checked={field.required} 
                          onChange={(e) => updateCustomField(field.id, { required: e.target.checked })} 
                          className="mr-2 h-4 w-4" 
                        />
                        <label htmlFor={`required-${field.id}`} className="text-sm font-medium">
                          Required Field
                        </label>
                      </div>
                    </div>
                    
                    {/* Dropdown Options - Only show for dropdown type */}
                    {field.type === 'dropdown' && (
                      <div className="mt-3 border-t pt-3">
                        <label className="block text-sm font-medium mb-1">Dropdown Options</label>
                        
                        {/* Display existing options */}
                        {field.options && field.options.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {field.options.map((option, index) => (
                              <div key={index} className="bg-blue-50 px-2 py-1 rounded-md flex items-center text-sm">
                                <span>{option}</span>
                                <button 
                                  type="button"
                                  onClick={() => removeOption(field.id, index)}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add new option */}
                        <div className="flex">
                          <input 
                            type="text" 
                            value={newOption.fieldId === field.id ? newOption.option : ''} 
                            onChange={(e) => setNewOption({ fieldId: field.id, option: e.target.value })} 
                            className="input mr-2" 
                            placeholder="Add option..."
                          />
                          <button 
                            type="button" 
                            onClick={() => addOption(field.id)} 
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <button 
              type="button" 
              onClick={addCustomField} 
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Field
            </button>
          </div>
        )}
        
        {/* Report Fields - Only shown for Online/Offline Biller */}
        {showReportFields && (
          <div className="mt-6 mb-4 p-4 border border-green-200 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Transaction Report Fields</h3>
            <p className="text-sm text-gray-600 mb-4">
              Define the field names that billers want to see in transaction reports.
            </p>
            
            {reportFields.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {reportFields.map((field, index) => (
                  <div key={index} className="bg-white px-3 py-1.5 rounded-md flex items-center text-sm shadow-sm">
                    <span>{field}</span>
                    <button 
                      type="button"
                      onClick={() => removeReportField(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new report field */}
            <div className="flex">
              <input 
                type="text" 
                value={newReportField} 
                onChange={(e) => setNewReportField(e.target.value)} 
                className="input mr-2" 
                placeholder="Add report field name..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addReportField();
                  }
                }}
              />
              <button 
                type="button" 
                onClick={addReportField} 
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Add
              </button>
            </div>
          </div>
        )}
        
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

