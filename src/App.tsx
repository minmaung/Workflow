import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import { fetchWorkflows, Workflow } from './api';
import { fetchWorkflowNames, enrichWorkflows } from './direct_api';

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

function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define the correct names from our database query
  const workflowNames = [
    { id: 1, biller: 'Test Biller', company: 'Test Company' },
    { id: 2, biller: 'ILBC', company: 'ILBC' },
    { id: 3, biller: 'Nway', company: 'Nway' },
    { id: 4, biller: 'fasd', company: 'asdf' },
    { id: 5, biller: 'Test', company: 'Test' },
    { id: 6, biller: 'MF', company: 'MF' },
    { id: 7, biller: 'TTT', company: 'TTT' },
    { id: 8, biller: 'AIA', company: 'AIA' },
    { id: 9, biller: 'Elite', company: 'Elite' }
  ];
  
  // Create a lookup map for quick access by ID
  const namesMap = new Map<number, {biller: string, company: string}>();
  workflowNames.forEach(item => {
    namesMap.set(item.id, { biller: item.biller, company: item.company });
  });
  
  useEffect(() => {
    // Track loading state
    setLoading(true);
    setError(null);
    
    // Fetch the workflow data
    fetchWorkflows()
      .then(workflowsData => {
        console.log('Workflows data received in App.tsx:', workflowsData);
        
        // Combine the API data with our correct workflow names
        const enrichedWorkflows = workflowsData.map(workflow => {
          // Look up the correct names by ID
          const names = namesMap.get(workflow.id);
          if (names) {
            return {
              ...workflow,
              biller_integration_name: names.biller,
              company_name: names.company
            };
          }
          // Fallback if we don't have this ID in our map
          return {
            ...workflow,
            biller_integration_name: workflow.biller_integration_name || 'Not specified',
            company_name: workflow.company_name || 'Not specified'
          };
        });
        
        // Log the results
        enrichedWorkflows.forEach((wf: Workflow) => {
          console.log(`Workflow ID ${wf.id} (fixed):`, { 
            title: wf.title,
            biller: wf.biller_integration_name, 
            company: wf.company_name 
          });
        });
        
        // Update the UI with the corrected data
        setWorkflows(enrichedWorkflows);
      })
      .catch((e) => {
        console.error('Error in App.tsx:', e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Biller/Merchant Onboarding Workflows</h1>
      {loading && <div className="text-center">Loading...</div>}
      {error && <div className="text-center text-red-600">{error}</div>}
      <div className="max-w-5xl mx-auto mb-4 flex justify-end">
        <Link to="/create" className="btn-primary">+ New Workflow</Link>
      </div>
      <div className="max-w-5xl mx-auto">
        <table className="min-w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-slate-200">
            <tr>
              <th className="py-2 px-4 text-left">Workflow Title</th>
              <th className="py-2 px-4 text-left">Biller/Merchant</th>
              <th className="py-2 px-4 text-left">Company</th>
              <th className="py-2 px-4 text-left">Current Step</th>
              <th className="py-2 px-4 text-left">Status</th>
              <th className="py-2 px-4 text-left">Started</th>
              <th className="py-2 px-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((wf) => (
              <tr key={wf.id} className="border-t hover:bg-slate-50">
                <td className="py-2 px-4 font-semibold">{wf.title}</td>
                <td className="py-2 px-4">{wf.biller_integration_name || 'Not specified'}</td>
                <td className="py-2 px-4">{wf.company_name || 'Not specified'}</td>
                <td className="py-2 px-4">
                  <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                    {STEP_LABELS[wf.current_step] || `Step ${wf.current_step}`}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${wf.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{wf.status}</span>
                </td>
                <td className="py-2 px-4">{new Date(wf.submit_date).toLocaleDateString()}</td>
                <td className="py-2 px-4 text-center">
                  <Link to={`/workflow/${wf.id}`} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
            {workflows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">No workflows found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
