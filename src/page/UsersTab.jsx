// src/pages/UsersTab.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { listUsers, updateUserStatus, bulkUserAction, deleteUser } from '../Redux/usersSlice';
import { 
  Ban, Trash2, CheckCircle, UserX, AlertTriangle, Users, 
  Search, ArrowUpDown, SortAsc, SortDesc, ShoppingBag
} from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

export default function UsersTab() {
  const dispatch = useDispatch();
  const { list: rawList, loading = false, error = null } = useSelector(state => state.users || {});
  
  // Memoize the list to prevent unnecessary re-renders
  const list = useMemo(() => Array.isArray(rawList) ? rawList : [], [rawList]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc'); // name_asc, name_desc, email_asc, email_desc, orders_high, orders_low, newest, oldest
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    dispatch(listUsers());
  }, [dispatch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSelectedIds([]);
    try {
      await dispatch(listUsers());
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    // First filter by search query
    let filtered = list;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = list.filter(user => {
        const name = (user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    // Then sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name_asc':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name_desc':
        return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      case 'email_asc':
        return sorted.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      case 'email_desc':
        return sorted.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
      case 'orders_high':
        return sorted.sort((a, b) => (b.totalOrders || b.orderCount || 0) - (a.totalOrders || a.orderCount || 0));
      case 'orders_low':
        return sorted.sort((a, b) => (a.totalOrders || a.orderCount || 0) - (b.totalOrders || b.orderCount || 0));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      default:
        return sorted;
    }
  }, [list, searchQuery, sortBy]);

  const handleSelect = useCallback((id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback((e) => {
    setSelectedIds(e.target.checked ? filteredAndSortedUsers.map(u => u._id) : []);
  }, [filteredAndSortedUsers]);

  const handleBulkAction = useCallback((action) => {
    if (window.confirm(`Perform ${action} on ${selectedIds.length} users?`)) {
      dispatch(bulkUserAction({ userIds: selectedIds, action }));
      setSelectedIds([]);
    }
  }, [dispatch, selectedIds]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    setSelectedIds([]); // Clear selections when searching
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedIds([]);
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
      case 'email_asc': return <SortAsc size={14} />;
      case 'email_desc': return <SortDesc size={14} />;
      case 'orders_high': return <SortDesc size={14} />;
      case 'orders_low': return <SortAsc size={14} />;
      default: return <ArrowUpDown size={14} />;
    }
  }, [sortBy]);

  // Stats for header
  const stats = useMemo(() => [
    {
      label: 'Total Users',
      value: list.length,
      icon: Users,
      bgClass: 'bg-primary/10',
      borderClass: 'border-primary/20',
      textClass: 'text-primary',
      iconClass: 'text-primary'
    },
    {
      label: 'Active',
      value: list.filter(u => u.status === 'Active').length,
      icon: CheckCircle,
      bgClass: 'bg-green-500/10',
      borderClass: 'border-green-500/20',
      textClass: 'text-green-500',
      iconClass: 'text-green-500'
    },
    {
      label: 'Suspended',
      value: list.filter(u => u.status === 'Suspended').length,
      icon: Ban,
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/20',
      textClass: 'text-red-500',
      iconClass: 'text-red-500'
    }
  ], [list]);

  // Toolbar component with search and sort
  const Toolbar = useCallback(() => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full sm:w-80 focus-within:border-primary/40 transition-colors">
        <Search size={12} className="text-white/30 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search users by name or email..."
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
          <option value="orders_high">Highest Orders</option>
          <option value="orders_low">Lowest Orders</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {getSortIcon()}
        </div>
      </div>
    </div>
  ), [searchQuery, sortBy, handleSearchChange, handleClearSearch, handleSortChange, getSortIcon]);

  return (
    <PageLayout 
      title="User Accounts" 
      icon={Users}
      description="Manage and moderate customer accounts"
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
      {!loading && searchQuery && filteredAndSortedUsers.length > 0 && (
        <div className="mb-3 text-xs text-white/40">
          Found {filteredAndSortedUsers.length} user{filteredAndSortedUsers.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 bg-primary/10 border border-primary/20 px-4 py-3 rounded-xl flex justify-between items-center">
          <span className="text-primary text-sm font-medium">{selectedIds.length} users selected</span>
          <div className="flex gap-2">
            <Button
              onClick={() => handleBulkAction('suspend')}
              variant="outline"
              size="sm"
              leftIcon={<Ban size={13} />}
            >
              Suspend
            </Button>
            <Button
              onClick={() => handleBulkAction('delete')}
              variant="destructive"
              size="sm"
              leftIcon={<Trash2 size={13} />}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-secondary/30 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-secondary/50">
              <th className="px-5 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                  onChange={handleSelectAll}
                  className="accent-primary"
                />
              </th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Customer</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Orders</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Status</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedUsers.map(user => (
              <tr
                key={user._id}
                className={`hover:bg-white/5 transition-all ${selectedIds.includes(user._id) ? 'bg-primary/5' : ''}`}
              >
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user._id)}
                    onChange={() => handleSelect(user._id)}
                    className="accent-primary"
                  />
                </td>
                <td className="px-5 py-4">
                  <div className="text-white font-medium text-sm">{user.firstName || user.lastName || user.firstName + ' ' + user.lastName}</div>
                  <div className="text-white/80 text-xs mt-0.5">{user.email}</div>
                  {user.createdAt && (
                    <div className="text-white/60 text-[9px] mt-0.5">
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag size={12} className="text-primary/60" />
                    <span className="text-white font-medium text-sm">
                      {user.totalOrders || user.orderCount || 0}
                    </span>
                    <span className="text-white/35 text-xs">orders</span>
                  </div>
                  {user.totalSpent && (
                    <div className="text-white/25 text-[9px] mt-0.5">
                      ₦{user.totalSpent.toLocaleString()} spent
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border ${
                    user.status === 'Active'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => dispatch(updateUserStatus({
                        userId: user._id,
                        status: user.status === 'Active' ? 'Suspended' : 'Active'
                      }))}
                      className="text-white/30 hover:text-white transition-colors"
                      title={user.status === 'Active' ? 'Suspend' : 'Activate'}
                    >
                      {user.status === 'Active' ? <UserX size={17} /> : <CheckCircle size={17} />}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${user.name}? This action cannot be undone.`)) {
                          dispatch(deleteUser(user._id));
                        }
                      }}
                      className="text-white/30 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Loading State */}
        {loading && filteredAndSortedUsers.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">Loading users...</div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSortedUsers.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">
            {searchQuery 
              ? `No users match "${searchQuery}"`
              : 'No users found'
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