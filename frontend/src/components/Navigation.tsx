import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  function handleLogout() {
    logout();
    navigate('/login');
  }
  
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Workflow Management</h1>
            
            {user && (
              <div className="flex space-x-4 ml-8">
                <Link to="/" className="hover:text-blue-200 transition">Dashboard</Link>
                
                {/* All users can create new workflows, but only B2B team can sign them off */}
                <Link to="/create" className="hover:text-blue-200 transition">New Workflow</Link>
                
                {/* All users can view workflows */}
                <Link to="/workflows" className="hover:text-blue-200 transition">All Workflows</Link>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm bg-blue-700 px-2 py-1 rounded">
                  {user.role} Team
                </span>
                <span>{user.username}</span>
                <button 
                  onClick={handleLogout}
                  className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded transition">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
