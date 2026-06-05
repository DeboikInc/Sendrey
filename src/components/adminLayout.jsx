// components/AdminLayout.jsx
import React, { useState } from 'react';
import Sidebar from './layout/Sidebar';

const AdminLayout = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-black-100">
      {/* Pass state to sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      {/* Adjust margin-left dynamically based on state */}
      <main className={`flex-1 transition-all duration-300 p-8 ${
        isSidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        {children}
      </main>
    </div>
  );
};
export default AdminLayout