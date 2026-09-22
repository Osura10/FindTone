import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  return (
    <>
      {/* Background gradients for the modern look */}
      <div className="bg-gradients">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
        <div className="gradient-sphere sphere-3"></div>
      </div>
      
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', margin: 0 }}>
        <Sidebar />
        
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh' }}>
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
