import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBusinessAccounts, revokeBusiness } from '../Redux/businessSlice';
import { AlertTriangle, Building2, Search, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

export default function BusinessTab() {
  const dispatch = useDispatch();
  const { accounts: rawAccounts, loading = false, error = null } = useSelector(state => state.business || {});
  const accounts = useMemo(() => Array.isArray(rawAccounts) ? rawAccounts : [], [rawAccounts]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    dispatch(getBusinessAccounts());
  }, [dispatch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(getBusinessAccounts());
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredAndSortedList = useMemo(() => {
    let filtered = accounts;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = accounts.filter(item => {
        const name = (item.businessProfile?.businessName || item.name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case 'name_asc':
        return sorted.sort((a, b) =>
          (a.businessProfile?.businessName || a.name || '').toLowerCase()
            .localeCompare((b.businessProfile?.businessName || b.name || '').toLowerCase()));
      case 'name_desc':
        return sorted.sort((a, b) =>
          (b.businessProfile?.businessName || b.name || '').toLowerCase()
            .localeCompare((a.businessProfile?.businessName || a.name || '').toLowerCase()));
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
  }, [accounts, searchQuery, sortBy]);

  const getSortIcon = () => {
    if (sortBy === 'newest') return <SortDesc size={14} />;
    if (sortBy === 'oldest' || sortBy === 'name_asc' || sortBy === 'email_asc') return <SortAsc size={14} />;
    return <ArrowUpDown size={14} />;
  };

  const stats = [
    {
      label: 'Business Accounts',
      value: accounts.length,
      icon: Building2,
      bgClass: 'bg-primary/10',
      borderClass: 'border-primary/20',
      textClass: 'text-primary',
      iconClass: 'text-primary'
    },
  ];

  return (
    <PageLayout
      title="Business Accounts"
      icon={Building2}
      description="Manage corporate accounts"
      stats={stats}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      toolbar={
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full sm:w-64 focus-within:border-primary/40 transition-colors">
            <Search size={12} className="text-white/30 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-transparent text-xs text-white/70 placeholder-white/25 outline-none w-full"
              autoComplete="off"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white/70 text-sm font-bold">×</button>
            )}
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
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
      }
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {!loading && searchQuery && filteredAndSortedList.length > 0 && (
        <div className="mb-3 text-xs text-white/40">
          Found {filteredAndSortedList.length} account{filteredAndSortedList.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      <div className="bg-secondary/30 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-secondary/50">
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Business / Owner</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Email</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedList.map(item => (
              <tr key={item._id} className="hover:bg-white/5 transition-all">
                <td className="px-5 py-4">
                  <div className="text-white font-medium text-sm">
                    {item.businessProfile?.businessName || `${item.firstName} ${item.lastName}`.trim()}
                  </div>
                  <div className="text-white/35 text-xs mt-0.5">
                    {`${item.firstName} ${item.lastName}`.trim()}
                  </div>
                  {item.createdAt && (
                    <div className="text-white/25 text-[9px] mt-0.5">
                      Converted: {new Date(item.businessProfile?.convertedAt || item.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="text-white/50 text-xs">{item.email}</div>
                </td>
                <td className="px-5 py-4 text-right">
                  <Button
                    onClick={() => dispatch(revokeBusiness(item._id))}
                    variant="destructive"
                    size="sm"
                  >
                    Revoke
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="p-10 text-center text-white/30 text-sm">Loading accounts...</div>
        )}

        {!loading && !error && filteredAndSortedList.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">
            {searchQuery ? `No accounts match "${searchQuery}"` : 'No business accounts found'}
            {searchQuery && (
              <div className="mt-2">
                <button onClick={() => setSearchQuery('')} className="text-xs text-primary hover:text-primary/80">
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