// src/pages/OrdersTab.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllOrders } from '../Redux/orderSlice';
import {
    CheckCircle, Clock, ShoppingBag,
    XCircle, AlertTriangle, MapPin, Bike, Calendar,
    Package, ChevronDown, ChevronUp, Search,
    ArrowUpDown, SortAsc, SortDesc
} from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';

const STATUS_CONFIG = {
    completed: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
    paid: { color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle },
    delivered: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
    items_approved: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
    items_submitted: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
    pending_payment: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
    cancelled: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
    disputed: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertTriangle },
};

function StatusPill({ status }) {
    const cfg = STATUS_CONFIG[status] || { color: 'bg-white/5 text-white/40 border-white/10', icon: Clock };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${cfg.color}`}>
            <Icon size={10} /> {status?.replace(/_/g, ' ')}
        </span>
    );
}

function OrderCard({ order }) {
    const [expanded, setExpanded] = useState(false);

    const customer = order.userId;
    const runner = order.runnerId;
    const location = order.deliveryLocation?.address || order.marketLocation?.address || '—';

    return (
        <div className="bg-secondary/30 border border-white/10 rounded-2xl transition-all hover:border-primary/20">
            {/* Main row */}
            <div
                className="p-4 sm:p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Order ID & Date */}
                    <div className="min-w-[120px]">
                        <p className="text-xs font-mono text-primary font-bold">{order.orderId}</p>
                        <div className="flex items-center gap-1 mt-1">
                            <Calendar size={10} className="text-white/30" />
                            <p className="text-[9px] text-white/30">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="min-w-[140px]">
                        <p className="text-xs text-white/80 font-medium">{customer?.firstName ?? '—'} {customer?.lastName ?? ''}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{customer?.phone}</p>
                    </div>

                    {/* Runner */}
                    <div className="min-w-[140px]">
                        <p className="text-xs text-white/80 font-medium">{runner?.firstName ?? '—'} {runner?.lastName ?? ''}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{runner?.phone}</p>
                    </div>

                    {/* Service + Location */}
                    <div className="flex-1 min-w-[160px]">
                        <div className="flex items-center gap-1 text-[10px] text-white/50">
                            <Bike size={11} className="text-primary shrink-0" />
                            <span className="capitalize">{order.serviceType?.replace(/-/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-white/30">
                            <MapPin size={10} className="shrink-0" />
                            <span className="truncate">{location}</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="min-w-[120px]">
                        <p className="text-sm font-bold text-white/90">₦{order.totalAmount?.toLocaleString()}</p>
                        <p className="text-[10px] text-white/30">Budget: ₦{order.itemBudget?.toLocaleString()}</p>
                    </div>

                    {/* Status */}
                    <div className="min-w-[110px]">
                        <StatusPill status={order.status} />
                        {order.hasDispute && (
                            <div className="mt-1 flex items-center gap-1 text-[9px] text-red-500">
                                <AlertTriangle size={9} /> Dispute
                            </div>
                        )}
                    </div>

                    {/* Expand button */}
                    <button
                        onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="p-2 bg-white/5 rounded-lg hover:text-primary text-white/40 transition-colors border border-white/10 shrink-0"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Expanded detail panel */}
            {expanded && (
                <div className="border-t border-white/5 px-4 sm:px-5 py-4 bg-secondary/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Financials breakdown */}
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <p size={12} className="text-primary" >₦</p>
                                <p className="text-[9px] text-white/30 uppercase tracking-widest">Financials</p>
                            </div>
                            {[
                                ['Total', `₦${order.totalAmount?.toLocaleString()}`],
                                ['Item Budget', `₦${order.itemBudget?.toLocaleString()}`],
                                ['Delivery Fee', `₦${order.deliveryFee?.toLocaleString()}`],
                                ['Platform Fee', `₦${order.platformFee?.toLocaleString()}`],
                                ['Runner Payout', `₦${order.runnerPayout?.toLocaleString()}`],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center py-0.5">
                                    <span className="text-[10px] text-white/40">{k}</span>
                                    <span className="text-[10px] text-white/70 font-medium">{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* Order info */}
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Package size={12} className="text-primary" />
                                <p className="text-[9px] text-white/30 uppercase tracking-widest">Order Info</p>
                            </div>
                            {[
                                ['Fleet', order.fleetType],
                                ['Payment', order.paymentStatus],
                                // ['Approval', order.approvalStatus],
                                ['Rated', order.isRated ? 'Yes' : 'No'],
                                // ['Confirmed By', order.deliveryConfirmedBy ?? '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center py-0.5">
                                    <span className="text-[10px] text-white/40 capitalize">{k}</span>
                                    <span className="text-[10px] text-white/70 font-medium capitalize">{v || '—'}</span>
                                </div>
                            ))}
                        </div>

                        {/* Customer */}
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Customer</p>
                            <p className="text-xs text-white/80 font-medium">{customer?.firstName} {customer?.lastName}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{customer?.email}</p>
                            <p className="text-[10px] text-white/40">{customer?.phone}</p>
                        </div>

                        {/* Runner */}
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Runner</p>
                            <p className="text-xs text-white/80 font-medium">{runner?.firstName} {runner?.lastName}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{runner?.email}</p>
                            <p className="text-[10px] text-white/40">{runner?.phone}</p>
                        </div>
                    </div>

                    {/* Status history timeline */}
                    {order.statusHistory?.length > 0 && (
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] text-white/30 uppercase tracking-widest mb-3">Status History</p>
                            <div className="flex flex-col gap-2">
                                {order.statusHistory.map((h, idx) => (
                                    <div key={h._id || idx} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-0.5" />
                                            {idx < order.statusHistory.length - 1 && (
                                                <div className="w-px h-4 bg-white/10 mt-1" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] text-white/70 font-medium capitalize">
                                                    {h.status?.replace(/_/g, ' ')}
                                                </span>
                                                {h.note && (
                                                    <p className="text-[9px] text-white/30 mt-0.5">{h.note}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[9px] text-white/30">
                                                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-[9px] text-white/20 capitalize">{h.triggeredBy}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function OrdersTab() {
    const dispatch = useDispatch();
    const { list: rawList, loading = false, error = null } = useSelector(state => state.orders || {});

    // Memoize the list to prevent unnecessary re-renders
    const list = useMemo(() => Array.isArray(rawList) ? rawList : [], [rawList]);

    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('date_desc');
    const [statusFilter, setStatusFilter] = useState('all');

    // Define statuses as a constant inside the component or use useMemo
    const statuses = useMemo(() =>
        [
            'all',
            'pending_payment',
            // 'items_submitted',
            // 'items_approved',
            'completed', 'cancelled', 'disputed'],
        []);

    useEffect(() => {
        dispatch(getAllOrders());
    }, [dispatch]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await dispatch(getAllOrders());
        } finally {
            setIsRefreshing(false);
        }
    };

    // Filter and sort orders
    const filteredAndSortedOrders = useMemo(() => {
        // First filter by status
        let filtered = statusFilter === 'all' ? list : list.filter(o => o.status === statusFilter);

        // Then filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(order => {
                const orderId = (order.orderId || '').toLowerCase();
                const customerName = `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.toLowerCase();
                const customerEmail = (order.userId?.email || '').toLowerCase();
                const runnerName = `${order.runnerId?.firstName || ''} ${order.runnerId?.lastName || ''}`.toLowerCase();
                const location = (order.deliveryLocation?.address || order.marketLocation?.address || '').toLowerCase();

                return orderId.includes(query) ||
                    customerName.includes(query) ||
                    customerEmail.includes(query) ||
                    runnerName.includes(query) ||
                    location.includes(query);
            });
        }

        // Then sort
        const sorted = [...filtered];
        switch (sortBy) {
            case 'date_asc':
                return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'date_desc':
                return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'amount_asc':
                return sorted.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
            case 'amount_desc':
                return sorted.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
            case 'budget_asc':
                return sorted.sort((a, b) => (a.itemBudget || 0) - (b.itemBudget || 0));
            case 'budget_desc':
                return sorted.sort((a, b) => (b.itemBudget || 0) - (a.itemBudget || 0));
            default:
                return sorted;
        }
    }, [list, statusFilter, searchQuery, sortBy]);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    const handleStatusFilterChange = useCallback((status) => {
        setStatusFilter(status);
    }, []);

    const handleSortChange = useCallback((e) => {
        setSortBy(e.target.value);
    }, []);

    const getSortIcon = useCallback(() => {
        switch (sortBy) {
            case 'date_desc': return <SortDesc size={14} />;
            case 'date_asc': return <SortAsc size={14} />;
            case 'amount_desc': return <SortDesc size={14} />;
            case 'amount_asc': return <SortAsc size={14} />;
            case 'budget_desc': return <SortDesc size={14} />;
            case 'budget_asc': return <SortAsc size={14} />;
            default: return <ArrowUpDown size={14} />;
        }
    }, [sortBy]);

    // Calculate stats
    const totalOrders = list.length;
    const totalSpent = list.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const completedOrders = list.filter(o => o.status === 'completed').length;

    // Stats for header
    const stats = useMemo(() => [
        {
            label: 'Total Orders',
            value: totalOrders,
            icon: ShoppingBag,
            bgClass: 'bg-primary/10',
            borderClass: 'border-primary/20',
            textClass: 'text-primary',
            iconClass: 'text-primary'
        },
        {
            label: 'Completed',
            value: completedOrders,
            icon: CheckCircle,
            bgClass: 'bg-green-500/10',
            borderClass: 'border-green-500/20',
            textClass: 'text-green-500',
            iconClass: 'text-green-500'
        },
        {
            label: 'Total Spent',
            value: `₦${totalSpent.toLocaleString()}`,
            icon: Package,
            bgClass: 'bg-yellow-500/10',
            borderClass: 'border-yellow-500/20',
            textClass: 'text-yellow-500',
            iconClass: 'text-yellow-500'
        }
    ], [totalOrders, completedOrders, totalSpent]);

    // Toolbar component with search, filters, and sort
    const Toolbar = useCallback(() => (
        <div className="flex flex-col gap-3">
            {/* Search and Sort Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search Input */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full focus-within:border-primary/40 transition-colors">
                        <Search size={12} className="text-white/30 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search by order ID, customer, runner, or location..."
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
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={handleSortChange}
                        className="appearance-none bg-secondary border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs text-white/70 focus:outline-none focus:border-primary/40 cursor-pointer"
                    >
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="amount_desc">Highest Amount</option>
                        <option value="amount_asc">Lowest Amount</option>
                        <option value="budget_desc">Highest Budget</option>
                        <option value="budget_asc">Lowest Budget</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        {getSortIcon()}
                    </div>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1 flex-wrap">
                {statuses.map(status => (
                    <button
                        key={status}
                        onClick={() => handleStatusFilterChange(status)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all
                            ${statusFilter === status
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-secondary/50 text-white/40 border border-white/10 hover:text-white/70'}`}
                    >
                        {status === 'all' ? `All (${list.length})` : status.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>
        </div>
    ), [searchQuery, sortBy, statusFilter, list.length, statuses, handleSearchChange, handleClearSearch, handleSortChange, handleStatusFilterChange, getSortIcon]);

    return (
        <PageLayout
            title="Orders"
            icon={ShoppingBag}
            description="Track and manage customer orders"
            stats={stats}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            toolbar={<Toolbar />}
        >
            {/* Error Display */}
            {error && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                    <AlertTriangle size={13} /> Error: {typeof error === 'string' ? error : 'Failed to load orders'}
                </div>
            )}

            {/* Search Results Count */}
            {!loading && searchQuery && filteredAndSortedOrders.length > 0 && (
                <div className="mb-3 text-xs text-white/40">
                    Found {filteredAndSortedOrders.length} order{filteredAndSortedOrders.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </div>
            )}

            {/* Loading State */}
            {loading && filteredAndSortedOrders.length === 0 && (
                <div className="p-10 text-center text-white/30 text-sm">Loading orders...</div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredAndSortedOrders.length === 0 && (
                <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                    <ShoppingBag size={32} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/40 text-sm">
                        {searchQuery
                            ? `No orders match "${searchQuery}"`
                            : 'No orders found'
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

            {/* Order cards */}
            {!loading && filteredAndSortedOrders.length > 0 && (
                <div className="grid gap-4">
                    {filteredAndSortedOrders.map(order => (
                        <OrderCard key={order._id} order={order} />
                    ))}
                </div>
            )}
        </PageLayout>
    );
}