import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Search, Star, Trash2, ShieldAlert,
    Bike, AlertTriangle, RotateCcw, Users, X,
    ArrowUpDown, SortAsc, SortDesc, CheckCircle
} from 'lucide-react';
import {
    getRunners, getRunnerStats,
    deleteRunner, banRunner, unbanRunner, resetStrikeCount
} from '../Redux/runnersSlice';
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
                                : confirmVariant === 'warning'
                                    ? 'bg-orange hover:bg-orange/80'
                                    : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RunnerActions({ runner, onBan, onUnban, onResetStrikes, onDelete, isMobile }) {
    return (
        <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : 'justify-end'}`}>
            {runner.runnerStatus === 'banned' ? (
                <Button
                    onClick={() => onUnban(runner)}
                    variant="outline"
                    size="xs"
                    className={isMobile ? 'flex-1' : ''}
                >
                    <CheckCircle size={13} className="mr-1" /> Lift Ban
                </Button>
            ) : (
                <Button
                    onClick={() => onBan(runner)}
                    variant="destructive"
                    size="xs"
                    className={isMobile ? 'flex-1' : ''}
                >
                    Ban Runner
                </Button>
            )}

            {runner.itemRejectionCount > 0 && (
                <button
                    onClick={() => onResetStrikes(runner)}
                    title="Reset strikes"
                    className="p-1.5 text-white/25 hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                >
                    <RotateCcw size={15} />
                </button>
            )}

            <button
                onClick={() => onDelete(runner)}
                className="p-1.5 text-white/25 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
            >
                <Trash2 size={15} />
            </button>
        </div>
    );
}

export default function RunnersTab() {
    const dispatch = useDispatch();
    const { list: rawList, stats = {}, loading = false, error = null } = useSelector(state => state.runners || {});
    const list = useMemo(() => Array.isArray(rawList) ? rawList : [], [rawList]);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [confirm, setConfirm] = useState(null);

    useEffect(() => {
        dispatch(getRunners());
        dispatch(getRunnerStats());
    }, [dispatch]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await dispatch(getRunners());
            await dispatch(getRunnerStats());
        } finally {
            setIsRefreshing(false);
        }
    };

    const filteredAndSortedRunners = useMemo(() => {
        let filtered = list;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = list.filter(runner => {
                const name = `${runner.firstName || ''} ${runner.lastName || ''}`.toLowerCase();
                const email = (runner.email || '').toLowerCase();
                const phone = (runner.phone || '').toLowerCase();
                return name.includes(query) || email.includes(query) || phone.includes(query);
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
            case 'rating_high':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'rating_low':
                return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
            case 'trips_high':
                return sorted.sort((a, b) => (b.completedOrders || 0) - (a.completedOrders || 0));
            case 'trips_low':
                return sorted.sort((a, b) => (a.completedOrders || 0) - (b.completedOrders || 0));
            case 'newest':
                return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            default:
                return sorted;
        }
    }, [list, searchQuery, sortBy]);

    const handleBan = useCallback((runner) => {
        setConfirm({
            title: 'Ban Runner',
            message: `Ban ${runner.firstName || runner.lastName || runner.firstName + ' ' + runner.lastName}? They will be prevented from taking any orders.`,
            confirmLabel: 'Ban Runner',
            confirmVariant: 'destructive',
            onConfirm: () => {
                dispatch(banRunner(runner._id));
                setConfirm(null);
            }
        });
    }, [dispatch]);

    const handleUnban = useCallback((runner) => {
        setConfirm({
            title: 'Lift Ban',
            message: `Lift the ban on ${runner.firstName} ${runner.lastName}? They will be able to take orders again.`,
            confirmLabel: 'Lift Ban',
            confirmVariant: 'primary',
            onConfirm: () => {
                dispatch(unbanRunner(runner._id));
                setConfirm(null);
            }
        });
    }, [dispatch]);

    const handleResetStrikes = useCallback((runner) => {
        setConfirm({
            title: 'Reset Strikes',
            message: `Reset ${runner.firstName} ${runner.lastName}'s ${runner.itemRejectionCount} strike${runner.itemRejectionCount !== 1 ? 's' : ''}? This cannot be undone.`,
            confirmLabel: 'Reset',
            confirmVariant: 'warning',
            onConfirm: () => {
                dispatch(resetStrikeCount(runner._id));
                setConfirm(null);
            }
        });
    }, [dispatch]);

    const handleDelete = useCallback((runner) => {
        setConfirm({
            title: 'Delete Runner',
            message: `Permanently delete ${runner.firstName || runner.lastName || runner.firstName + ' ' + runner.lastName}? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: () => {
                dispatch(deleteRunner(runner._id));
                setConfirm(null);
            }
        });
    }, [dispatch]);

    const getSortIcon = () => {
        if (['newest', 'name_desc', 'rating_high', 'trips_high'].includes(sortBy)) return <SortDesc size={14} />;
        if (['oldest', 'name_asc', 'rating_low', 'trips_low'].includes(sortBy)) return <SortAsc size={14} />;
        return <ArrowUpDown size={14} />;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'banned': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'approved_full': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'approved_limited': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-white/5 text-white/40 border-white/10';
        }
    };

    const runnerStats = useMemo(() => [
        {
            label: 'Total Runners',
            value: stats.total || 0,
            icon: Users,
            bgClass: 'bg-primary/10',
            borderClass: 'border-primary/20',
            textClass: 'text-primary',
            iconClass: 'text-primary'
        },
        {
            label: 'Active',
            value: stats.available || 0,
            icon: Bike,
            bgClass: 'bg-green-500/10',
            borderClass: 'border-green-500/20',
            textClass: 'text-green-500',
            iconClass: 'text-green-500'
        },
        {
            label: 'Banned',
            value: stats.byStatus?.find(s => s._id === 'banned')?.count || 0,
            icon: ShieldAlert,
            bgClass: 'bg-red-500/10',
            borderClass: 'border-red-500/20',
            textClass: 'text-red-500',
            iconClass: 'text-red-500'
        }
    ], [stats]);

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
                title="Runners"
                icon={Bike}
                description="Manage and monitor runner accounts"
                stats={runnerStats}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                toolbar={
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-white/25" size={15} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email, or phone..."
                                className="w-full bg-secondary/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors"
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-2.5 text-white/30 hover:text-white/70 text-sm font-bold"
                                >
                                    ×
                                </button>
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
                                <option value="rating_high">Highest Rating</option>
                                <option value="rating_low">Lowest Rating</option>
                                <option value="trips_high">Most Trips</option>
                                <option value="trips_low">Least Trips</option>
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
                        <AlertTriangle size={13} /> {typeof error === 'string' ? error : 'Something went wrong'}
                    </div>
                )}

                {!loading && searchQuery && filteredAndSortedRunners.length > 0 && (
                    <div className="mb-3 text-xs text-white/40">
                        Found {filteredAndSortedRunners.length} runner{filteredAndSortedRunners.length !== 1 ? 's' : ''} matching "{searchQuery}"
                    </div>
                )}

                {loading && (
                    <div className="p-10 text-center text-white/30 text-sm">Loading runners...</div>
                )}

                {!loading && !error && filteredAndSortedRunners.length === 0 && (
                    <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                        <Bike size={32} className="mx-auto text-white/20 mb-3" />
                        <p className="text-white/40 text-sm">
                            {searchQuery ? `No runners match "${searchQuery}"` : 'No runners found'}
                        </p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-primary hover:text-primary/80">
                                Clear search
                            </button>
                        )}
                    </div>
                )}

                {!loading && filteredAndSortedRunners.length > 0 && (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block bg-secondary/30 border border-white/10 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 bg-secondary/50">
                                        <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Runner</th>
                                        <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Performance</th>
                                        <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium">Status</th>
                                        <th className="px-5 py-3 text-[10px] text-white/30 tracking-widest uppercase font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredAndSortedRunners.map(runner => (
                                        <tr key={runner._id} className="hover:bg-white/5 transition-all">
                                            <td className="px-5 py-4">
                                                <div className="text-white font-medium text-sm">{runner.firstName} {runner.lastName}</div>
                                                <div className="text-white/35 text-xs mt-0.5">{runner.email}</div>
                                                <div className="text-white/25 text-xs mt-0.5">{runner.phone}</div>
                                                {runner.createdAt && (
                                                    <div className="text-white/25 text-[9px] mt-0.5">
                                                        Joined: {new Date(runner.createdAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1 text-primary font-medium text-sm">
                                                    <Star size={13} fill="currentColor" /> {runner.rating || 'N/A'}
                                                </div>
                                                <div className="text-white/70 text-xs mt-0.5">{runner.completedOrders || 0} trips</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border ${getStatusStyle(runner.runnerStatus)}`}>
                                                    {runner.runnerStatus?.replace(/_/g, ' ') || '—'}
                                                </span>
                                                {runner.itemRejectionCount > 0 && (
                                                    <div className="text-[10px] text-red-500/70 mt-1">
                                                        {runner.itemRejectionCount} strike{runner.itemRejectionCount !== 1 ? 's' : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <RunnerActions
                                                    runner={runner}
                                                    onBan={handleBan}
                                                    onUnban={handleUnban}
                                                    onResetStrikes={handleResetStrikes}
                                                    onDelete={handleDelete}
                                                    isMobile={false}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {filteredAndSortedRunners.map(runner => (
                                <div key={runner._id} className="bg-secondary/30 border border-white/10 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-white font-medium text-sm">{runner.firstName} {runner.lastName}</div>
                                            <div className="text-white/35 text-xs mt-0.5">{runner.email}</div>
                                            <div className="text-white/25 text-xs mt-0.5">{runner.phone}</div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border shrink-0 ${getStatusStyle(runner.runnerStatus)}`}>
                                            {runner.runnerStatus?.replace(/_/g, ' ') || '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs flex-wrap">
                                        <div className="flex items-center gap-1 text-primary font-medium">
                                            <Star size={12} fill="currentColor" /> {runner.rating || 'N/A'}
                                        </div>
                                        <div className="text-white/35">{runner.completedOrders || 0} trips</div>
                                        {runner.itemRejectionCount > 0 && (
                                            <div className="text-red-500/70">
                                                {runner.itemRejectionCount} strike{runner.itemRejectionCount !== 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-1 border-t border-white/5">
                                        <RunnerActions
                                            runner={runner}
                                            onBan={handleBan}
                                            onUnban={handleUnban}
                                            onResetStrikes={handleResetStrikes}
                                            onDelete={handleDelete}
                                            isMobile={true}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </PageLayout>
        </>
    );
}