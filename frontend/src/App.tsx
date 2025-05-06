import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import { fetchWorkflows } from './api';

interface Workflow {
  id: number;
  title: string;
  biller_integration_name: string;
  company_name: string;
  current_step: number;
  status: string;
  submit_date: string;
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

function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows()
      .then(setWorkflows)
      .catch((e) => setError(e.message))
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
                <td className="py-2 px-4">{wf.biller_integration_name}</td>
                <td className="py-2 px-4">{wf.company_name}</td>
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
