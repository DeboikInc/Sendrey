// src/pages/PayoutTab.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    FileText, ChevronDown, ChevronUp,
    User, Bike, CreditCard, AlertTriangle, Search,
    ArrowUpDown, SortAsc, SortDesc
} from 'lucide-react';
import { getPayoutReceipts } from '../Redux/payoutSlice';
import PageLayout from '../components/layout/PageLayout';

function ReceiptCard({ receipt }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-secondary/30 border border-white/10 rounded-2xl transition-all hover:border-primary/20">
            {/* Main row */}
            <div
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Icon */}
                <div className="p-3 rounded-xl shrink-0 self-start bg-primary/10 text-primary">
                    <FileText size={20} />
                </div>

                {/* Core details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                            <p className="font-bold text-sm text-white/90">
                                {receipt.vendorName || '—'}
                            </p>
                            <p className="text-xs text-white/40 mt-0.5 font-mono">
                                {receipt.orderId}
                            </p>
                        </div>
                    </div>

                    {/* Key numbers */}
                    <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-xs text-white/70 font-bold">
                            Spent: ₦{receipt.amountSpent?.toLocaleString() ?? '—'}
                        </span>
                        {receipt.changeAmount > 0 && (
                            <span className="text-xs text-green-500 font-bold">
                                Change: ₦{receipt.changeAmount?.toLocaleString()}
                            </span>
                        )}
                        <span className="text-xs text-white/40">
                            Budget: ₦{receipt.itemBudget?.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-white/30">
                            {new Date(receipt.submittedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {/* Expand button only */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                        className="p-2 bg-white/5 rounded-lg hover:text-primary text-white/40 transition-colors border border-white/10"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Expanded detail panel */}
            {expanded && (
                <div className="border-t border-white/5 px-4 sm:px-5 py-4 bg-secondary/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                        {/* Runner info */}
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Bike size={12} className="text-primary" />
                                <p className="text-[9px] text-white/30 uppercase tracking-widest">Runner</p>
                            </div>
                            {receipt.runner ? (
                                <>
                                    <p className="text-xs text-white/80 font-medium">{receipt.runner.firstName} {receipt.runner.lastName || ''}</p>
                                    <p className="text-[10px] text-white/40 mt-0.5">{receipt.runner.email}</p>
                                    <p className="text-[10px] text-white/40">{receipt.runner.phone}</p>
                                </>
                            ) : (
                                <p className="text-[10px] text-white/25 italic">Not available</p>
                            )}
                        </div>

                        {/* User info */}
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={12} className="text-primary" />
                                <p className="text-[9px] text-white/30 uppercase tracking-widest">Customer</p>
                            </div>
                            {receipt.user ? (
                                <>
                                    <p className="text-xs text-white/80 font-medium">{receipt.user.firstName} {receipt.user.lastName || ''}</p>
                                    <p className="text-[10px] text-white/40 mt-0.5">{receipt.user.phone}</p>
                                </>
                            ) : (
                                <p className="text-[10px] text-white/25 italic">Not available</p>
                            )}
                        </div>

                        {/* Bank details */}
                        <div className="bg-secondary/30 rounded-xl p-3 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard size={12} className="text-primary" />
                                <p className="text-[9px] text-white/30 uppercase tracking-widest">Bank Details</p>
                            </div>
                            {receipt.bankDetails ? (
                                <>
                                    <p className="text-xs text-white/80 font-medium">{receipt.bankDetails.accountName}</p>
                                    <p className="text-[10px] text-white/50 mt-0.5">{receipt.bankDetails.bankName}</p>
                                    <p className="text-[10px] text-white/40 font-mono">{receipt.bankDetails.accountNumber}</p>
                                </>
                            ) : (
                                <p className="text-[10px] text-white/25 italic">No bank details</p>
                            )}
                        </div>

                        {/* Extra details row */}
                        <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                ['Receipt ID / Transaction ID', receipt.receiptId?.slice(-8) || receipt.submissionId?.slice(-8) || '—'],
                                ['Status', receipt.payoutStatus],
                                ['Date', new Date(receipt.submittedAt).toLocaleString()],
                                // ['Reviewed', receipt.reviewedAt ? new Date(receipt.reviewedAt).toLocaleString() : '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-secondary/30 rounded-lg p-2 border border-white/5">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest">{k}</p>
                                    <p className="text-[10px] text-white/60 mt-0.5 font-medium capitalize">{v}</p>
                                </div>
                            ))}
                        </div>

                        {/* Receipt image */}
                        {receipt.receiptUrl && (
                            <div className="sm:col-span-3">
                                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Receipt Image</p>
                                <img
                                    src={receipt.receiptUrl}
                                    alt="Receipt"
                                    className="w-full max-w-sm h-48 object-cover rounded-xl border border-white/10"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PayoutTab() {
    const dispatch = useDispatch();
    const { receipts: rawReceipts, loading = false, error = null } = useSelector(state => state.payout || state.payouts || {});
    
    // Memoize the receipts to prevent unnecessary re-renders
    const receipts = useMemo(() => Array.isArray(rawReceipts) ? rawReceipts : [], [rawReceipts]);

    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('date_desc');

    useEffect(() => {
        dispatch(getPayoutReceipts());
    }, [dispatch]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await dispatch(getPayoutReceipts());
        } finally {
            setIsRefreshing(false);
        }
    };

    // Filter and sort receipts
    const filteredAndSortedReceipts = useMemo(() => {
        // First filter by search query
        let filtered = receipts;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = receipts.filter(receipt => {
                const orderId = (receipt.orderId || '').toLowerCase();
                const vendorName = (receipt.vendorName || '').toLowerCase();
                const receiptId = (receipt.receiptId || receipt.submissionId || '').toLowerCase();
                
                return orderId.includes(query) || 
                       vendorName.includes(query) || 
                       receiptId.includes(query);
            });
        }

        // Then sort
        const sorted = [...filtered];
        switch (sortBy) {
            case 'date_asc':
                return sorted.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
            case 'date_desc':
                return sorted.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
            case 'amount_asc':
                return sorted.sort((a, b) => (a.amountSpent || 0) - (b.amountSpent || 0));
            case 'amount_desc':
                return sorted.sort((a, b) => (b.amountSpent || 0) - (a.amountSpent || 0));
            case 'budget_asc':
                return sorted.sort((a, b) => (a.itemBudget || 0) - (b.itemBudget || 0));
            case 'budget_desc':
                return sorted.sort((a, b) => (b.itemBudget || 0) - (a.itemBudget || 0));
            default:
                return sorted;
        }
    }, [receipts, searchQuery, sortBy]);

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
            case 'date_desc': return <SortDesc size={14} />;
            case 'date_asc': return <SortAsc size={14} />;
            case 'amount_desc': return <SortDesc size={14} />;
            case 'amount_asc': return <SortAsc size={14} />;
            case 'budget_desc': return <SortDesc size={14} />;
            case 'budget_asc': return <SortAsc size={14} />;
            default: return <ArrowUpDown size={14} />;
        }
    }, [sortBy]);

    // Stats for header
    const stats = useMemo(() => [
        {
            label: 'Total Receipts',
            value: receipts.length,
            icon: FileText,
            bgClass: 'bg-primary/10',
            borderClass: 'border-primary/20',
            textClass: 'text-primary',
            iconClass: 'text-primary'
        }
    ], [receipts.length]);

    // Toolbar component with search and sort
    const Toolbar = useCallback(() => (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Input */}
            <div className="flex-1">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full focus-within:border-primary/40 transition-colors">
                    <Search size={12} className="text-white/30 shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search by order ID, vendor, or receipt ID..."
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
    ), [searchQuery, sortBy, handleSearchChange, handleClearSearch, handleSortChange, getSortIcon]);

    return (
        <PageLayout 
            title="Payout Receipts" 
            icon={FileText}
            description="View runner payout receipts"
            stats={stats}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            toolbar={<Toolbar />}
        >
            {/* Error Display */}
            {error && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                    <AlertTriangle size={13} /> Error: {typeof error === 'string' ? error : 'Failed to load receipts'}
                </div>
            )}

            {/* Search Results Count */}
            {!loading && searchQuery && filteredAndSortedReceipts.length > 0 && (
                <div className="mb-3 text-xs text-white/40">
                    Found {filteredAndSortedReceipts.length} receipt{filteredAndSortedReceipts.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </div>
            )}

            {/* Loading State */}
            {loading && filteredAndSortedReceipts.length === 0 && (
                <div className="p-10 text-center text-white/30 text-sm">Loading receipts...</div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredAndSortedReceipts.length === 0 && (
                <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                    <FileText size={32} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/40 text-sm">
                        {searchQuery 
                            ? `No receipts match "${searchQuery}"`
                            : 'No payout receipts found'
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

            {/* Receipt cards */}
            {!loading && filteredAndSortedReceipts.length > 0 && (
                <div className="grid gap-4">
                    {filteredAndSortedReceipts.map(receipt => (
                        <ReceiptCard key={receipt.receiptId || receipt._id} receipt={receipt} />
                    ))}
                </div>
            )}
        </PageLayout>
    );
}