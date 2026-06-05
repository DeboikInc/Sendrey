// src/pages/UsersTab.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { listUsers, 
  // exportUsers, 
  updateUserStatus, bulkUserAction, deleteUser } from '../Redux/usersSlice';
import { 
  // Download,
  Ban, Trash2, CheckCircle, UserX, AlertTriangle, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

export default function UsersTab() {
  const dispatch = useDispatch();
  const { list: rawList, loading = false, error = null } = useSelector(state => state.users || {});
  const list = Array.isArray(rawList) ? rawList : [];

  const [selectedIds, setSelectedIds] = useState([]);
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

  const handleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? list.map(u => u._id) : []);
  };

  const handleBulkAction = (action) => {
    if (window.confirm(`Perform ${action} on ${selectedIds.length} users?`)) {
      dispatch(bulkUserAction({ userIds: selectedIds, action }));
      setSelectedIds([]);
    }
  };

  // const handleExport = () => {
  //   dispatch(exportUsers());
  // };

  // Stats for header
  const stats = [
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
  ];

  // Header action button (Export)
  // const HeaderAction = () => (
  //   <Button
  //     onClick={handleExport}
  //     variant="outline"
  //     size="sm"
  //     leftIcon={<Download size={15} />}
  //   >
  //     Export CSV
  //   </Button>
  // );

  return (
    <PageLayout 
      title="User Accounts" 
      icon={Users}
      description="Manage and moderate customer accounts"
      stats={stats}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      // headerAction={<HeaderAction />}
    >
      {/* Error Display */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          <AlertTriangle size={13} /> {error}
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
                  checked={selectedIds.length === list.length && list.length > 0}
                  onChange={handleSelectAll}
                  className="accent-primary"
                />
              </th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Customer</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Status</th>
              <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map(user => (
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
                  <div className="text-white font-medium text-sm">{user.name}</div>
                  <div className="text-white/35 text-xs mt-0.5">{user.email}</div>
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
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Loading State */}
        {loading && list.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">Loading users...</div>
        )}

        {/* Empty State */}
        {!loading && !error && list.length === 0 && (
          <div className="p-10 text-center text-white/30 text-sm">No users found</div>
        )}
      </div>
    </PageLayout>
  );
}