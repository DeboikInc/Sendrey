// src/pages/RunnersTab.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Search, Star, Trash2, ShieldAlert,
    Bike, AlertTriangle, RotateCcw, Users,
    ArrowUpDown, SortAsc, SortDesc
} from 'lucide-react';
import {
    getRunners, getRunnerStats,
    deleteRunner, banRunner, unbanRunner, resetStrikeCount
} from '../Redux/runnersSlice';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

function RunnerActions({ runner, dispatch, handleDelete, isMobile }) {
    return (
        <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : 'justify-end'}`}>
            {runner.runnerStatus === 'banned' ? (
                <Button
                    onClick={() => {
                        if (window.confirm(`Unban ${runner.firstName}?`)) {
                            dispatch(unbanRunner(runner._id));
                        }
                    }}
                    variant="outline"
                    size="xs"
                    className={isMobile ? 'flex-1' : ''}
                >
                    Raise Ban
                </Button>
            ) : (
                <Button
                    onClick={() => {
                        if (window.confirm(`Ban ${runner.firstName}? They will be prevented from taking orders.`)) {
                            dispatch(banRunner(runner._id));
                        }
                    }}
                    variant="destructive"
                    size="xs"
                    className={isMobile ? 'flex-1' : ''}
                >
                    Ban Runner
                </Button>
            )}

            {runner.itemRejectionCount > 0 && (
                <button
                    onClick={() => {
                        if (window.confirm(`Reset ${runner.firstName}'s strike count?`)) {
                            dispatch(resetStrikeCount(runner._id));
                        }
                    }}
                    title="Reset strikes"
                    className="p-1.5 text-white/25 hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                >
                    <RotateCcw size={15} />
                </button>
            )}

            <button
                onClick={() => handleDelete(runner._id, runner.firstName)}
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
    
    // Memoize the list to prevent unnecessary re-renders
    const list = useMemo(() => Array.isArray(rawList) ? rawList : [], [rawList]);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name_asc'); // name_asc, name_desc, rating_high, rating_low, trips_high, trips_low, newest, oldest
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    // Filter and sort runners
    const filteredAndSortedRunners = useMemo(() => {
        // First filter by search query
        let filtered = list;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = list.filter(runner => {
                const firstName = (runner.firstName || '').toLowerCase();
                const lastName = (runner.lastName || '').toLowerCase();
                const email = (runner.email || '').toLowerCase();
                const phone = (runner.phone || '').toLowerCase();
                return firstName.includes(query) || 
                       lastName.includes(query) || 
                       email.includes(query) || 
                       phone.includes(query);
            });
        }

        // Then sort
        const sorted = [...filtered];
        switch (sortBy) {
            case 'name_asc':
                return sorted.sort((a, b) => {
                    const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
                    const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'name_desc':
                return sorted.sort((a, b) => {
                    const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
                    const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
                    return nameB.localeCompare(nameA);
                });
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

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
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
            case 'rating_high': return <SortDesc size={14} />;
            case 'rating_low': return <SortAsc size={14} />;
            case 'trips_high': return <SortDesc size={14} />;
            case 'trips_low': return <SortAsc size={14} />;
            default: return <ArrowUpDown size={14} />;
        }
    }, [sortBy]);

    const handleDelete = (id, name) => {
        if (window.confirm(`Delete ${name}? This action is permanent.`)) {
            dispatch(deleteRunner(id));
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'banned': 
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'approved_full': 
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'approved_limited': 
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: 
                return 'bg-white/5 text-white/40 border-white/10';
        }
    };

    // Stats for header
    const runnerStats = useMemo(() => [
        {
            label: 'Total Runners',
            value: stats.total || 0,
            icon: Users,
            colorClass: 'text-primary'
        },
        {
            label: 'Active',
            value: stats.available || 0,
            icon: Bike,
            colorClass: 'text-green-500'
        },
        {
            label: 'Banned',
            value: stats.byStatus?.find(s => s._id === 'banned')?.count || 0,
            icon: ShieldAlert,
            colorClass: 'text-red-500'
        }
    ], [stats]);

    // Toolbar component with search and sort
    const Toolbar = useCallback(() => (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-white/25" size={15} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search runners by name, email, or phone..."
                    className="w-full bg-secondary/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors"
                    autoComplete="off"
                />
                {searchQuery && (
                    <button
                        onClick={handleClearSearch}
                        className="absolute right-3 top-2.5 text-white/30 hover:text-white/70 transition-colors text-sm font-bold"
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
    ), [searchQuery, sortBy, handleSearchChange, handleClearSearch, handleSortChange, getSortIcon]);

    return (
        <PageLayout 
            title="Runners" 
            icon={Bike}
            description="Manage and monitor runner accounts"
            stats={runnerStats}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            toolbar={<Toolbar />}
        >
            {/* Error Display */}
            {error && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                    <AlertTriangle size={13} /> {typeof error === 'string' ? error : 'Something went wrong'}
                </div>
            )}

            {/* Search Results Count */}
            {!loading && searchQuery && filteredAndSortedRunners.length > 0 && (
                <div className="mb-3 text-xs text-white/40">
                    Found {filteredAndSortedRunners.length} runner{filteredAndSortedRunners.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </div>
            )}

            {/* Loading State */}
            {loading && filteredAndSortedRunners.length === 0 && (
                <div className="p-10 text-center text-white/30 text-sm">Loading runners...</div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredAndSortedRunners.length === 0 && (
                <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                    <Bike size={32} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/40 text-sm">
                        {searchQuery 
                            ? `No runners match "${searchQuery}"`
                            : 'No runners found'
                        }
                    </p>
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            )}

            {/* Desktop Table */}
            {!loading && filteredAndSortedRunners.length > 0 && (
                <>
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
                                            <div className="text-white/35 text-xs mt-0.5">{runner.completedOrders || 0} trips</div>
                                            {runner.totalEarnings && (
                                                <div className="text-white/25 text-[9px] mt-0.5">
                                                    ₦{runner.totalEarnings.toLocaleString()} earned
                                                </div>
                                            )}
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
                                                dispatch={dispatch} 
                                                handleDelete={handleDelete} 
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
                                {/* Top row: name + status */}
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

                                {/* Stats row */}
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

                                {/* Actions row */}
                                <div className="pt-1 border-t border-white/5">
                                    <RunnerActions 
                                        runner={runner} 
                                        dispatch={dispatch} 
                                        handleDelete={handleDelete} 
                                        isMobile={true}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </PageLayout>
    );
}