import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the return path from location state or default to home
  const from = location.state?.from?.pathname || '/';
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      await login(username, password);
      // Redirect to the page they tried to visit or home
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the auth context
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Workflow Management System</h2>
        <h3 className="text-xl font-semibold mb-6 text-center">Team Login</h3>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block font-medium mb-1">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block font-medium mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              required
              disabled={loading}
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium mb-2">Available Team Accounts:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li><strong>B2B Team:</strong> Username: b2b</li>
            <li><strong>Integration Team:</strong> Username: integration</li>
            <li><strong>QA Team:</strong> Username: qa</li>
            <li><strong>Finance Team:</strong> Username: finance</li>
            <li><em className="text-xs">(For demo purposes, all passwords match the pattern: [username]pass)</em></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
