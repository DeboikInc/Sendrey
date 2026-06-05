// src/pages/RunnersTab.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Search, Star, Trash2, ShieldAlert,
    Bike, AlertTriangle, RotateCcw, Users
} from 'lucide-react';
import {
    getRunners, searchRunners, getRunnerStats,
    deleteRunner, banRunner, unbanRunner, resetStrikeCount
} from '../Redux/runnersSlice';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';
import debounce from 'lodash/debounce';

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

// function StatCard({ label, value, icon, colorClass }) {
//     return (
//         <div className="bg-secondary/30 border border-white/10 p-4 rounded-2xl">
//             <div className={`mb-2 ${colorClass}`}>{icon}</div>
//             <div className="text-white text-xl font-bold">{value ?? '—'}</div>
//             <div className="text-white/35 text-[10px] font-medium uppercase tracking-wider mt-1">{label}</div>
//         </div>
//     );
// }

export default function RunnersTab() {
    const dispatch = useDispatch();
    const { list: rawList, stats = {}, loading = false, error = null } = useSelector(state => state.runners || {});
    const list = Array.isArray(rawList) ? rawList : [];

    const [searchTerm, setSearchTerm] = useState('');
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

    const debouncedSearch = useMemo(
        () => debounce((query) => { dispatch(searchRunners(query)); }, 500),
        [dispatch]
    );

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    };

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
    const runnerStats = [
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
    ];

    // Toolbar component
    const Toolbar = () => (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-white/25" size={15} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    placeholder="Search runners by name, email, or phone..."
                    className="w-full bg-secondary/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors"
                />
            </div>
        </div>
    );

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

            {/* Loading State */}
            {loading && list.length === 0 && (
                <div className="p-10 text-center text-white/30 text-sm">Loading runners...</div>
            )}

            {/* Empty State */}
            {!loading && !error && list.length === 0 && (
                <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                    <Bike size={32} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/40 text-sm">No runners found</p>
                </div>
            )}

            {/* Desktop Table */}
            {!loading && list.length > 0 && (
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
                                {list.map(runner => (
                                    <tr key={runner._id} className="hover:bg-white/5 transition-all">
                                        <td className="px-5 py-4">
                                            <div className="text-white font-medium text-sm">{runner.firstName} {runner.lastName}</div>
                                            <div className="text-white/35 text-xs mt-0.5">{runner.email}</div>
                                            <div className="text-white/25 text-xs mt-0.5">{runner.phone}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1 text-primary font-medium text-sm">
                                                <Star size={13} fill="currentColor" /> {runner.rating || 'N/A'}
                                            </div>
                                            <div className="text-white/35 text-xs mt-0.5">{runner.completedOrders || 0} trips</div>
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
                        {list.map(runner => (
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
                                <div className="flex items-center gap-4 text-xs">
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