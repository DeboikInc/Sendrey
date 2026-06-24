// src/components/layout/Sidebar.jsx
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Briefcase, Users, LogOut,
  LayoutDashboard, Package, CreditCard, X, Settings
} from 'lucide-react';
import { adminLogout } from '../../Redux/authSlice';
import Button from '../ui/Button';
// import DarkModeToggle from '../ui/DarkModeToggle';
import logo from '../../assets/Sendrey-Logo-Variants-09.png';

const NAV_ITEMS = [
  { label: 'KYC', key: 'dashboard', icon: LayoutDashboard },
  { label: 'Disputes', key: 'disputes', icon: AlertTriangle },
  { label: 'Business Users', key: 'business-users', icon: Briefcase },
  { label: 'Users', key: 'users', icon: Users },
  { label: 'Runners', key: 'runner-list', icon: Users },
  { label: 'Orders', key: 'orders', icon: Package },
  { label: 'Payouts', key: 'payout', icon: CreditCard },
  { label: 'Config', key: 'config', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await dispatch(adminLogout());
    navigate('/');
  };

  const handleNavigation = (key) => {
    onNavigate(key);
    onClose?.(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile overlay - only show when isOpen is true */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col 
          bg-secondary/90 border-r border-gray-200 dark:border-white/5
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex lg:z-auto
        `}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <div>
            <img src={logo} alt="Sendrey logo" className="w-2/3 mb-1 dark:brightness-0 dark:invert" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary dark:text-primary">
              Admin
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-lg text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavigation(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-white/50 hover:bg-secondary/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-white/5 space-y-2">
          {/* Dark Mode Toggle - Uncomment when ready */}
          {/* <DarkModeToggle variant="ghost" size="sm" className="w-full justify-start" /> */}
          
          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            fullWidth
            leftIcon={<LogOut size={17} />}
            className="justify-start text-primary hover:text-primary/70 dark:text-primary dark:hover:text-primary/70"
          >
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}