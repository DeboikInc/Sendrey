// src/pages/PayoutTab.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    FileText, ChevronDown, ChevronUp,
    User, Bike, CreditCard, AlertTriangle, Search
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
                                ['Receipt ID', receipt.receiptId?.slice(-8) || receipt.submissionId?.slice(-8) || '—'],
                                ['Status', receipt.payoutStatus],
                                ['Date', new Date(receipt.submittedAt).toLocaleString()],
                                ['Reviewed', receipt.reviewedAt ? new Date(receipt.reviewedAt).toLocaleString() : '—'],
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
    const receipts = Array.isArray(rawReceipts) ? rawReceipts : [];

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('date_desc');
    const [searchTerm, setSearchTerm] = useState('');

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

    // Filter by search term
    const filteredBySearch = receipts.filter(r => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            r.orderId?.toLowerCase().includes(term) ||
            r.vendorName?.toLowerCase().includes(term) ||
            r.receiptId?.toLowerCase().includes(term)
        );
    });

    // Sort receipts
    const sortedReceipts = useMemo(() => {
        const sorted = [...filteredBySearch];
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
    }, [filteredBySearch, sortBy]);

    // Stats for header
    const stats = [
        {
            label: 'Total Receipts',
            value: receipts.length,
            icon: FileText,
            bgClass: 'bg-primary/10',
            borderClass: 'border-primary/20',
            textClass: 'text-primary',
            iconClass: 'text-primary'
        }
    ];

    // Toolbar component
    const Toolbar = () => (
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-white/25" size={15} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by order ID, vendor, or receipt..."
                    className="w-full bg-secondary/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors"
                />
            </div>

            <div className="flex gap-2">
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 rounded-lg text-sm bg-secondary/50 border border-white/10 text-white outline-none focus:border-primary/40 transition-colors"
                >
                    <option value="date_desc">Newest first</option>
                    <option value="date_asc">Oldest first</option>
                    <option value="amount_desc">Highest amount</option>
                    <option value="amount_asc">Lowest amount</option>
                    <option value="budget_desc">Highest budget</option>
                    <option value="budget_asc">Lowest budget</option>
                </select>
            </div>
        </div>
    );

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

            {/* Loading State */}
            {loading && sortedReceipts.length === 0 && (
                <div className="p-10 text-center text-white/30 text-sm">Loading receipts...</div>
            )}

            {/* Empty State */}
            {!loading && !error && sortedReceipts.length === 0 && (
                <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                    <FileText size={32} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/40 text-sm">No payout receipts found.</p>
                </div>
            )}

            {/* Receipt cards */}
            {!loading && sortedReceipts.length > 0 && (
                <div className="grid gap-4">
                    {sortedReceipts.map(receipt => (
                        <ReceiptCard key={receipt.receiptId || receipt._id} receipt={receipt} />
                    ))}
                </div>
            )}
        </PageLayout>
    );
}