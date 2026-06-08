import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { listUsers, updateUserStatus, bulkUserAction, deleteUser } from '../Redux/usersSlice';
import {
    Ban, Trash2, CheckCircle, AlertTriangle, Users,
    Search, ArrowUpDown, SortAsc, SortDesc, ShoppingBag, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', confirmVariant = 'destructive', onConfirm, onCancel }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-secondary border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h3 className="text-white font-bold text-sm">{title}</h3>
                    <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="px-5 py-4">
                    <p className="text-white/60 text-sm">{message}</p>
                </div>
                <div className="px-5 py-4 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:border-white/20 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all ${
                            confirmVariant === 'destructive'
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-orange hover:bg-orange/80'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function UsersTab() {
    const dispatch = useDispatch();
    const { list: rawList, loading = false, error = null } = useSelector(state => state.users || {});
    const list = useMemo(() => Array.isArray(rawList) ? rawList : [], [rawList]);

    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, confirmLabel, confirmVariant }

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

    const filteredAndSortedUsers = useMemo(() => {
        let filtered = list;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = list.filter(user => {
                const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
                const email = (user.email || '').toLowerCase();
                return name.includes(query) || email.includes(query);
            });
        }

        const sorted = [...filtered];
        switch (sortBy) {
            case 'name_asc':
                return sorted.sort((a, b) =>
                    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
            case 'name_desc':
                return sorted.sort((a, b) =>
                    `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
            case 'email_asc':
                return sorted.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
            case 'email_desc':
                return sorted.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
            case 'orders_high':
                return sorted.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
            case 'orders_low':
                return sorted.sort((a, b) => (a.orderCount || 0) - (b.orderCount || 0));
            case 'newest':
                return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            default:
                return sorted;
        }
    }, [list, searchQuery, sortBy]);

    const handleSelect = useCallback((id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const handleSelectAll = useCallback((e) => {
        setSelectedIds(e.target.checked ? filteredAndSortedUsers.map(u => u._id) : []);
    }, [filteredAndSortedUsers]);

    const handleSuspend = useCallback((user) => {
        setConfirm({
            title: 'Suspend User',
            message: `Suspend ${user.firstName || user.lastName || user.firstName + ' ' + user.lastName}? They will lose access to the platform.`,
            confirmLabel: 'Suspend',
            confirmVariant: 'destructive',
            onConfirm: () => {
                dispatch(updateUserStatus({ userId: user._id, isActive: false }));
                setConfirm(null);
            }
        });
    }, [dispatch]);

    const handleActivate = useCallback((user) => {
        setConfirm({
            title: 'Activate User',
            message: `Reactivate ${user.firstName} ${user.lastName}? They will regain access to the platform.`,
            confirmLabel: 'Activate',
            confirmVariant: 'primary',
            onConfirm: () => {
                dispatch(updateUserStatus({ userId: user._id, isActive: true }));
                setConfirm(null);
            }
        });
    }, [dispatch]);

    const handleDelete = useCallback((user) => {
        setConfirm({
            title: 'Delete User',
            message: `Permanently delete ${user.firstName || user.lastName || user.firstName + ' ' + user.lastName}? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: () => {
                dispatch(deleteUser(user._id));
                setConfirm(null);
            }
        });
    }, [dispatch]);

    const handleBulkAction = useCallback((action) => {
        const label = action === 'delete' ? 'Delete' : 'Suspend';
        setConfirm({
            title: `Bulk ${label}`,
            message: `${label} ${selectedIds.length} selected users? This cannot be undone.`,
            confirmLabel: label,
            confirmVariant: 'destructive',
            onConfirm: () => {
                dispatch(bulkUserAction({ userIds: selectedIds, action }));
                setSelectedIds([]);
                setConfirm(null);
            }
        });
    }, [dispatch, selectedIds]);

    const getSortIcon = () => {
        if (['newest', 'name_desc', 'email_desc', 'orders_high'].includes(sortBy)) return <SortDesc size={14} />;
        if (['oldest', 'name_asc', 'email_asc', 'orders_low'].includes(sortBy)) return <SortAsc size={14} />;
        return <ArrowUpDown size={14} />;
    };

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
            value: list.filter(u => u.isActive).length,
            icon: CheckCircle,
            bgClass: 'bg-green-500/10',
            borderClass: 'border-green-500/20',
            textClass: 'text-green-500',
            iconClass: 'text-green-500'
        },
        {
            label: 'Suspended',
            value: list.filter(u => !u.isActive).length,
            icon: Ban,
            bgClass: 'bg-red-500/10',
            borderClass: 'border-red-500/20',
            textClass: 'text-red-500',
            iconClass: 'text-red-500'
        }
    ], [list]);

    return (
        <>
            <ConfirmModal
                isOpen={!!confirm}
                title={confirm?.title}
                message={confirm?.message}
                confirmLabel={confirm?.confirmLabel}
                confirmVariant={confirm?.confirmVariant}
                onConfirm={confirm?.onConfirm}
                onCancel={() => setConfirm(null)}
            />

            <PageLayout
                title="User Accounts"
                icon={Users}
                description="Manage and moderate customer accounts"
                stats={stats}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                toolbar={
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full sm:w-80 focus-within:border-primary/40 transition-colors">
                            <Search size={12} className="text-white/30 shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setSelectedIds([]); }}
                                placeholder="Search by name or email..."
                                className="bg-transparent text-xs text-white/70 placeholder-white/25 outline-none w-full"
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setSelectedIds([]); }} className="text-white/30 hover:text-white/70 text-sm font-bold">×</button>
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
                }
            >
                {error && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                        <AlertTriangle size={13} /> {error}
                    </div>
                )}

                {!loading && searchQuery && filteredAndSortedUsers.length > 0 && (
                    <div className="mb-3 text-xs text-white/40">
                        Found {filteredAndSortedUsers.length} user{filteredAndSortedUsers.length !== 1 ? 's' : ''} matching "{searchQuery}"
                    </div>
                )}

                {selectedIds.length > 0 && (
                    <div className="mb-4 bg-primary/10 border border-primary/20 px-4 py-3 rounded-xl flex justify-between items-center">
                        <span className="text-primary text-sm font-medium">{selectedIds.length} users selected</span>
                        <div className="flex gap-2">
                            <Button onClick={() => handleBulkAction('suspend')} variant="outline" size="sm" leftIcon={<Ban size={13} />}>
                                Suspend
                            </Button>
                            <Button onClick={() => handleBulkAction('delete')} variant="destructive" size="sm" leftIcon={<Trash2 size={13} />}>
                                Delete
                            </Button>
                        </div>
                    </div>
                )}

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
                                        <div className="text-white font-medium text-sm">
                                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || '—'}
                                        </div>
                                        <div className="text-white/50 text-xs mt-0.5">{user.email}</div>
                                        {user.createdAt && (
                                            <div className="text-white/25 text-[9px] mt-0.5">
                                                Joined: {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <ShoppingBag size={12} className="text-primary/60" />
                                            <span className="text-white font-medium text-sm">{user.orderCount ?? 0}</span>
                                            <span className="text-white/35 text-xs">orders</span>
                                        </div>
                                        {user.totalSpent > 0 && (
                                            <div className="text-white/25 text-[9px] mt-0.5">
                                                ₦{user.totalSpent.toLocaleString()} spent
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border ${
                                            user.isActive
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                            {user.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            {user.isActive ? (
                                                <button
                                                    onClick={() => handleSuspend(user)}
                                                    className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <Ban size={13} /> Suspend
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleActivate(user)}
                                                    className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle size={13} /> Activate
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="text-xs text-white/30 hover:text-red-400 font-medium transition-colors flex items-center gap-1"
                                            >
                                                <Trash2 size={13} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {loading && (
                        <div className="p-10 text-center text-white/30 text-sm">Loading users...</div>
                    )}

                    {!loading && !error && filteredAndSortedUsers.length === 0 && (
                        <div className="p-10 text-center text-white/30 text-sm">
                            {searchQuery ? `No users match "${searchQuery}"` : 'No users found'}
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
        </>
    );
}