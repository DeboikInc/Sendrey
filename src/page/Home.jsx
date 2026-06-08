// src/pages/Home.jsx
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

import Disputes from './DisputesTab';
import BusinessTab from './BusinessTab';
import KycTab from './KycTab';
import RunnersTab from './RunnersTab';
import UsersTab from './UsersTab';
import OrdersTab from './OrdersTab';
import PayoutTab from './PayoutTab';

const PAGES = {
  'dashboard':      <KycTab />,
  'disputes':       <Disputes />,
  'business-users': <BusinessTab />,
  'runner-list':    <RunnersTab />,
  'users':          <UsersTab />,
  'orders':         <OrdersTab />,
  'payout':         <PayoutTab />,
};

export default function Home() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-secondary overflow-hidden">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={isSidebarOpen}  // Changed from 'open' to 'isOpen'
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-neutral border-b border-white/5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-white capitalize">
            {activePage.replace('-', ' ')}
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {PAGES[activePage]}
        </main>
      </div>
    </div>
  );
}