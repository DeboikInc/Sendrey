// src/pages/BusinessTab.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBusinessAccounts, getSuggestions, convertToBusiness, revokeBusiness } from '../Redux/businessSlice';
import { UserPlus, AlertTriangle, Building2, Users, Briefcase, Search, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

export default function BusinessTab() {
  const dispatch = useDispatch();
  const { accounts: rawAccounts, suggestions: rawSuggestions, loading = false, error = null } = useSelector(state => state.business || {});
  
  // Memoize the arrays to prevent unnecessary re-renders
  const accounts = useMemo(() => Array.isArray(rawAccounts) ? rawAccounts : [], [rawAccounts]);
  const suggestions = useMemo(() => Array.isArray(rawSuggestions) ? rawSuggestions : [], [rawSuggestions]);

  const [currentView, setCurrentView] = useState('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc'); // name_asc, name_desc, email_asc, email_desc, newest, oldest
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

  // Get the base list based on current view
  const baseList = useMemo(() => {
    return currentView === 'accounts' ? accounts : suggestions;
  }, [currentView, accounts, suggestions]);

  // Filter and sort the list
  const filteredAndSortedList = useMemo(() => {
    // First filter by search query
    let filtered = baseList;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = baseList.filter(item => {
        const name = (item.businessName || item.name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    // Then sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name_asc':
        return sorted.sort((a, b) => {
          const nameA = (a.businessName || a.name || '').toLowerCase();
          const nameB = (b.businessName || b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case 'name_desc':
        return sorted.sort((a, b) => {
          const nameA = (a.businessName || a.name || '').toLowerCase();
          const nameB = (b.businessName || b.name || '').toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case 'email_asc':
        return sorted.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      case 'email_desc':
        return sorted.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      default:
        return sorted;
    }
  }, [baseList, searchQuery, sortBy]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
    setSearchQuery(''); // Clear search when switching views
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const getSortIcon = useCallback(() => {
    switch (sortBy) {
      case 'newest': return <SortDesc size={14} />;
      case 'oldest': return <SortAsc size={14} />;
      case 'name_asc': return <SortAsc size={14} />;
      case 'name_desc': return <SortDesc size={14} />;
      default: return <ArrowUpDown size={14} />;
    }
  }, [sortBy]);

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

  // Toolbar component with view toggle, search, and sort
  const Toolbar = useCallback(() => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* View toggle buttons */}
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-medium">
        <button
          onClick={() => handleViewChange('accounts')}
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
          onClick={() => handleViewChange('suggestions')}
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

      {/* Search and Sort */}
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full sm:w-64 focus-within:border-primary/40 transition-colors">
          <Search size={12} className="text-white/30 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={`Search ${currentView === 'accounts' ? 'accounts' : 'leads'} by name or email...`}
            className="bg-transparent text-xs text-white/70 placeholder-white/25 outline-none w-full"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="text-white/30 hover:text-white/70 transition-colors text-sm font-bold"
              type="button"
            >
              ×
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="appearance-none bg-secondary border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs text-white/70 focus:outline-none focus:border-primary/40 cursor-pointer"
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="email_asc">Email (A-Z)</option>
            <option value="email_desc">Email (Z-A)</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            {getSortIcon()}
          </div>
        </div>
      </div>
    </div>
  ), [currentView, accounts.length, suggestions.length, searchQuery, sortBy, handleViewChange, handleSearchChange, handleClearSearch, handleSortChange, getSortIcon]);

  return (
    <PageLayout 
      title="Business" 
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

      {/* Search Results Count */}
      {!loading && searchQuery && filteredAndSortedList.length > 0 && (
        <div className="mb-3 text-xs text-white/40">
          Found {filteredAndSortedList.length} {currentView === 'accounts' ? 'account' : 'lead'}
          {filteredAndSortedList.length !== 1 ? 's' : ''} matching "{searchQuery}"
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
            {filteredAndSortedList.map(item => (
              <tr key={item._id} className="hover:bg-white/5 transition-all">
                <td className="px-5 py-4">
                  <div className="text-white font-medium text-sm">{item.businessName || item.name}</div>
                  <div className="text-white/35 text-xs mt-0.5">{item.email}</div>
                  {item.createdAt && (
                    <div className="text-white/25 text-[9px] mt-0.5">
                      Joined: {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  )}
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
        {loading && filteredAndSortedList.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">
            Loading {currentView === 'accounts' ? 'accounts' : 'suggestions'}...
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSortedList.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">
            {searchQuery 
              ? `No ${currentView === 'accounts' ? 'accounts' : 'leads'} match "${searchQuery}"`
              : `No ${currentView === 'accounts' ? 'business accounts' : 'suggestions'} found`
            }
            {searchQuery && (
              <div className="mt-2">
                <button
                  onClick={handleClearSearch}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}