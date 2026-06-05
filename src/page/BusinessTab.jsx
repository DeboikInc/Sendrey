// src/pages/BusinessTab.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBusinessAccounts, getSuggestions, convertToBusiness, revokeBusiness } from '../Redux/businessSlice';
import { UserPlus, AlertTriangle, Building2, Users, Briefcase } from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

export default function BusinessTab() {
  const dispatch = useDispatch();
  const { accounts: rawAccounts, suggestions: rawSuggestions, loading = false, error = null } = useSelector(state => state.business || {});
  const accounts = Array.isArray(rawAccounts) ? rawAccounts : [];
  const suggestions = Array.isArray(rawSuggestions) ? rawSuggestions : [];

  const [currentView, setCurrentView] = useState('accounts');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    dispatch(getBusinessAccounts());
    dispatch(getSuggestions());
  }, [dispatch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(getBusinessAccounts());
      await dispatch(getSuggestions());
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeList = currentView === 'accounts' ? accounts : suggestions;

  // Stats for the header
  const stats = [
    {
      label: 'Active Accounts',
      value: accounts.length,
      icon: Building2,
      bgClass: 'bg-primary/10',
      borderClass: 'border-primary/20',
      textClass: 'text-primary',
      iconClass: 'text-primary'
    },
    {
      label: 'Conversion Leads',
      value: suggestions.length,
      icon: Users,
      bgClass: 'bg-yellow-500/10',
      borderClass: 'border-yellow-500/20',
      textClass: 'text-yellow-500',
      iconClass: 'text-yellow-500'
    }
  ];

  // Toolbar component
  const Toolbar = () => (
    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-medium">
      <button
        onClick={() => setCurrentView('accounts')}
        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
          currentView === 'accounts' 
            ? 'bg-primary text-white' 
            : 'text-white/40 hover:text-white'
        }`}
      >
        <Briefcase size={14} />
        Active Accounts ({accounts.length})
      </button>
      <button
        onClick={() => setCurrentView('suggestions')}
        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
          currentView === 'suggestions' 
            ? 'bg-primary text-white' 
            : 'text-white/40 hover:text-white'
        }`}
      >
        <Users size={14} />
        Suggestions ({suggestions.length})
      </button>
    </div>
  );

  return (
    <PageLayout 
      title="Business Ecosystem" 
      icon={Building2}
      description="Manage corporate accounts and conversion leads"
      stats={stats}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      toolbar={<Toolbar />}
    >
      {/* Error Display */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-secondary/30 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-secondary/50">
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Entity / User</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Type</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {activeList.map(item => (
              <tr key={item._id} className="hover:bg-white/5 transition-all">
                <td className="px-5 py-4">
                  <div className="text-white font-medium text-sm">{item.businessName || item.name}</div>
                  <div className="text-white/35 text-xs mt-0.5">{item.email}</div>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-medium border ${
                    currentView === 'accounts'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    {currentView === 'accounts' ? 'Corporate Account' : 'Conversion Lead'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {currentView === 'accounts' ? (
                    <Button
                      onClick={() => dispatch(revokeBusiness(item._id))}
                      variant="destructive"
                      size="sm"
                    >
                      Revoke
                    </Button>
                  ) : (
                    <Button
                      onClick={() => dispatch(convertToBusiness(item._id))}
                      variant="primary"
                      size="sm"
                      leftIcon={<UserPlus size={13} />}
                    >
                      Convert
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Loading State */}
        {loading && activeList.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">
            Loading {currentView === 'accounts' ? 'accounts' : 'suggestions'}...
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && activeList.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">
            No {currentView === 'accounts' ? 'business accounts' : 'suggestions'} found
          </div>
        )}
      </div>
    </PageLayout>
  );
}