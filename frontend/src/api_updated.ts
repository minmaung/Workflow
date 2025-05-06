// API utility for backend requests
export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export async function fetchWorkflows() {
  try {
    const res = await fetch(`${API_BASE}/workflows`);
    if (!res.ok) throw new Error(`Failed to fetch workflows: ${res.status} ${res.statusText}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching workflows:', error);
    throw error;
  }
}
