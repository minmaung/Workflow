// API utility for backend requests
export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

// Define TypeScript interfaces for our data structures
export interface Workflow {
  id: number;
  title: string;
  biller_integration_name?: string;
  company_name?: string;
  current_step: number;
  status: string;
  submit_date: string;
  custom_fields?: any[];
  report_fields?: string[];
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  try {
    console.log('Fetching workflows from API...');
    // Add cache-busting parameter to avoid cached responses
    const timestamp = new Date().getTime();
    const res = await fetch(`${API_BASE}/workflows?_=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) throw new Error(`Failed to fetch workflows: ${res.status} ${res.statusText}`);
    
    const data = await res.json();
    console.log('API Response:', data);
    
    // Extract workflows array from the response - could be directly an array or inside a 'value' property
    const workflows = Array.isArray(data) ? data : (data.value || []);
    console.log('Extracted workflows array:', workflows);
    
    // Transform the data to ensure all required fields are present
    const transformedData: Workflow[] = workflows.map((workflow: any) => ({
      ...workflow,
      // Ensure these fields exist, even if they're null/undefined in the API response
      biller_integration_name: workflow.biller_integration_name || '',
      company_name: workflow.company_name || ''
    }));
    
    console.log('Transformed data:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error fetching workflows:', error);
    throw error;
  }
}
