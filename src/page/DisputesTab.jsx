// src/pages/Disputes.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    getAllDisputes, resolveDispute,
    setSelectedDispute, clearSelectedDispute, clearResolveStatus,
} from '../Redux/disputeSlice';
import {
    AlertTriangle, Clock, CheckCircle, MessageSquare,
    RefreshCw, X, ShieldAlert
} from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';

// Reusable Info Row Component
const InfoRow = ({ label, value }) => {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
            <span className="text-xs text-white/50">{label}</span>
            <span className="text-xs text-white font-medium capitalize">{value ?? '—'}</span>
        </div>
    );
};

// Resolution Outcomes Configuration
const RESOLUTION_OUTCOMES = [
    { value: 'full_refund', label: 'Full Refund to Customer', description: '100% back to user wallet', variant: 'primary' },
    { value: 'full_release', label: 'Full Release to Runner', description: '100% released to runner', variant: 'primary' },
    { value: 'partial_refund', label: 'Partial Refund', description: 'Split — set % for user', variant: 'warning' },
    { value: 'partial_release', label: 'Partial Release', description: 'Split — set % for runner', variant: 'warning' },
    { value: 'dismiss_dispute', label: 'Dismiss Dispute', description: 'Close without action — suspected fraud', variant: 'destructive' },
];

// Resolution Modal Component
const ResolutionModal = ({ dispute, onClose, resolveStatus, resolveError }) => {
    const dispatch = useDispatch();
    const [selectedOutcome, setSelectedOutcome] = useState('');
    const [splitPercentage, setSplitPercentage] = useState(50);
    const [adminNote, setAdminNote] = useState('');
    const isLoading = resolveStatus === 'loading';
    const isPartialOutcome = selectedOutcome === 'partial_refund' || selectedOutcome === 'partial_release';

    const customer = dispute.userId || {};
    const runner = dispute.runnerId || {};

    const handleSubmitResolution = () => {
        if (!selectedOutcome) return;
        dispatch(resolveDispute({
            disputeId: dispute.disputeId,
            resolutionData: {
                outcome: selectedOutcome,
                releasePercentage: isPartialOutcome ? splitPercentage : undefined,
                adminNote: adminNote,
            },
        }));
    };

    useEffect(() => {
        if (resolveStatus === 'succeeded') {
            setTimeout(() => {
                dispatch(clearResolveStatus());
                onClose();
            }, 1500);
        }
    }, [resolveStatus, dispatch, onClose]);

    const getOutcomeStyles = (outcomeValue) => {
        if (selectedOutcome !== outcomeValue) return 'bg-secondary/30 border-white/10 hover:border-white/20';
        
        if (outcomeValue === 'dismiss_dispute') {
            return 'bg-red-500/10 border-red-500/40';
        }
        return 'bg-primary/10 border-primary/40';
    };

    const getOutcomeTextStyles = (outcomeValue) => {
        if (selectedOutcome !== outcomeValue) return 'text-white';
        
        if (outcomeValue === 'dismiss_dispute') {
            return 'text-red-500';
        }
        return 'text-primary';
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-secondary/30 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-secondary/30">
                    <div>
                        <h2 className="text-white font-bold text-sm">Resolve Dispute</h2>
                        <p className="text-white/40 text-[10px] font-mono mt-0.5">{dispute.disputeId}</p>
                    </div>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        leftIcon={<X size={14} />}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10"
                    />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-secondary/30">
                    {/* Customer & Runner Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/50 rounded-xl border border-white/10 p-3">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Customer</p>
                            <p className="text-sm text-white font-bold">
                                {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email}
                            </p>
                            <p className="text-xs text-white/40 mt-0.5">{customer.email}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-xl border border-white/10 p-3">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Runner</p>
                            <p className="text-sm text-white font-bold">{runner.firstName} {runner.lastName}</p>
                            <p className="text-xs text-white/40 mt-0.5">{runner.email}</p>
                        </div>
                    </div>

                    {/* Dispute Details */}
                    <div className="bg-secondary/50 rounded-xl border border-white/10 p-4">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Dispute Details</p>
                        <InfoRow label="Reason" value={dispute.reason?.replace(/_/g, ' ')} />
                        <InfoRow label="Description" value={dispute.description} />
                        <InfoRow label="Order" value={dispute.orderId} />
                        <InfoRow label="Raised By" value={dispute.initiatedByModel} />
                        <InfoRow label="Status" value={dispute.status} />
                    </div>

                    {/* Fraud Alert */}
                    {dispute.flaggedAsFraud && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
                            <AlertTriangle size={14} className="text-red-500 shrink-0" />
                            <p className="text-xs text-red-500 font-bold">This dispute was previously flagged for fraud</p>
                        </div>
                    )}

                    {/* Resolution Outcomes */}
                    <div className="space-y-2">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Resolution Outcome</p>
                        {RESOLUTION_OUTCOMES.map((outcome) => (
                            <button
                                key={outcome.value}
                                onClick={() => setSelectedOutcome(outcome.value)}
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${getOutcomeStyles(outcome.value)}`}
                            >
                                <p className={`text-sm font-bold ${getOutcomeTextStyles(outcome.value)}`}>
                                    {outcome.label}
                                </p>
                                <p className="text-xs text-white/40 mt-0.5">{outcome.description}</p>
                            </button>
                        ))}
                    </div>

                    {/* Split Percentage Slider */}
                    {isPartialOutcome && (
                        <div className="bg-secondary/50 rounded-xl border border-white/10 p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-white/50">
                                    {selectedOutcome === 'partial_release' ? 'Runner gets' : 'Customer gets'}
                                </p>
                                <p className="text-sm text-white font-bold">{splitPercentage}%</p>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="90"
                                value={splitPercentage}
                                onChange={e => setSplitPercentage(Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-white/30">
                                <span>Customer: {selectedOutcome === 'partial_release' ? 100 - splitPercentage : splitPercentage}%</span>
                                <span>Runner: {selectedOutcome === 'partial_release' ? splitPercentage : 100 - splitPercentage}%</span>
                            </div>
                        </div>
                    )}

                    {/* Admin Note */}
                    <textarea
                        value={adminNote}
                        onChange={e => setAdminNote(e.target.value)}
                        placeholder="Admin note (sent to both parties)..."
                        rows={2}
                        className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 resize-none transition-colors"
                    />

                    {/* Error/Success Messages */}
                    {resolveError && (
                        <div className="text-xs text-white bg-red-500/20 border border-red-500/30 px-3 py-2 rounded-lg">
                            {resolveError}
                        </div>
                    )}

                    {resolveStatus === 'succeeded' && (
                        <div className="text-xs text-white bg-green-500/20 border border-green-500/30 px-3 py-2 rounded-lg flex items-center gap-2">
                            <CheckCircle size={12} className="text-green-500" /> Dispute resolved successfully
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-white/10 flex gap-3 shrink-0 bg-secondary/30">
                    <Button onClick={onClose} variant="ghost" fullWidth>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmitResolution}
                        variant={selectedOutcome === 'dismiss_dispute' ? 'destructive' : 'primary'}
                        fullWidth
                        isLoading={isLoading}
                        loadingText="Resolving..."
                        disabled={!selectedOutcome || isLoading}
                    >
                        Confirm Resolution
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Main Disputes Component
export default function Disputes() {
    const dispatch = useDispatch();

    const {
        list: rawDisputeList,
        loading: isLoading = false,
        error: errorMessage = null,
        selectedDispute,
        resolveStatus,
        resolveError,
    } = useSelector(state => state.dispute || {});
    
    const disputeList = Array.isArray(rawDisputeList) ? rawDisputeList : [];

    const [activeFilter, setActiveFilter] = useState('All');
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        dispatch(getAllDisputes());
    }, [dispatch]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await dispatch(getAllDisputes());
        } finally {
            setIsRefreshing(false);
        }
    };

    const getFilteredDisputes = () => {
        return disputeList.filter(dispute => {
            if (activeFilter === 'All') return true;
            if (activeFilter === 'Pending') {
                return dispute.status === 'open' || dispute.status === 'pending' || dispute.status === 'under_review';
            }
            if (activeFilter === 'Resolved') return dispute.status === 'resolved';
            if (activeFilter === 'Dismissed') return dispute.status === 'dismissed';
            return true;
        });
    };

    const getDisputeCardBorderClass = (dispute) => {
        const isPending = dispute.status === 'open' || dispute.status === 'pending' || dispute.status === 'under_review';
        const isDismissed = dispute.status === 'dismissed';
        
        if (isPending) return 'border-primary/20 hover:border-primary/40';
        if (isDismissed) return 'border-orange-500/20 hover:border-orange-500/40';
        return 'border-white/10 hover:border-green-500/30';
    };

    const filteredDisputes = getFilteredDisputes();

    // Stats for the header
    const stats = [
        {
            label: 'Total Disputes',
            value: disputeList.length,
            icon: ShieldAlert,
            bgClass: 'bg-primary/10',
            borderClass: 'border-primary/20',
            textClass: 'text-primary',
            iconClass: 'text-primary'
        },
        {
            label: 'Pending',
            value: disputeList.filter(d => d.status === 'open' || d.status === 'pending' || d.status === 'under_review').length,
            icon: Clock,
            bgClass: 'bg-yellow-500/10',
            borderClass: 'border-yellow-500/20',
            textClass: 'text-yellow-500',
            iconClass: 'text-yellow-500'
        },
        {
            label: 'Resolved',
            value: disputeList.filter(d => d.status === 'resolved').length,
            icon: CheckCircle,
            bgClass: 'bg-green-500/10',
            borderClass: 'border-green-500/20',
            textClass: 'text-green-500',
            iconClass: 'text-green-500'
        }
    ];

    // Toolbar component
    const Toolbar = () => (
        <div className="flex gap-2 flex-wrap">
            {['All', 'Pending', 'Resolved', 'Dismissed'].map((filterLabel) => (
                <Button
                    key={filterLabel}
                    onClick={() => setActiveFilter(filterLabel)}
                    variant={activeFilter === filterLabel ? 'primary' : 'outline'}
                    size="sm"
                >
                    {filterLabel}
                </Button>
            ))}
        </div>
    );

    return (
        <>
            <PageLayout 
                title="Disputes" 
                icon={ShieldAlert}
                description="Review and resolve order conflicts"
                stats={stats}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                toolbar={<Toolbar />}  // Pass toolbar as a prop
            >
                {/* Error Display */}
                {errorMessage && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                        <AlertTriangle size={13} /> {errorMessage}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && filteredDisputes.length === 0 && (
                    <div className="flex justify-center py-16">
                        <RefreshCw className="animate-spin text-primary" size={22} />
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && filteredDisputes.length === 0 && (
                    <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                        <AlertTriangle size={28} className="text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No disputes found.</p>
                    </div>
                )}

                {/* Disputes List */}
                <div className="grid gap-4">
                    {filteredDisputes.map((dispute) => {
                        const isInitiatorUser = dispute.initiatedByModel === 'User';
                        const initiator = isInitiatorUser ? dispute.userId : dispute.runnerId;
                        const respondent = isInitiatorUser ? dispute.runnerId : dispute.userId;

                        const initiatorName = initiator
                            ? `${initiator.firstName || ''} ${initiator.lastName || ''}`.trim() || initiator.email
                            : 'Unknown';

                        const respondentName = respondent
                            ? `${respondent.firstName || ''} ${respondent.lastName || ''}`.trim() || respondent.email
                            : 'Unknown';

                        const isPending = dispute.status === 'open' || dispute.status === 'pending' || dispute.status === 'under_review';
                        const isDismissed = dispute.status === 'dismissed';

                        return (
                            <div
                                key={dispute._id}
                                className={`bg-secondary/30 border rounded-2xl p-5 transition-all ${getDisputeCardBorderClass(dispute)}`}
                            >
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                                    {/* Left Section */}
                                    <div className="flex gap-4 flex-1">
                                        <div className="text-primary shrink-0">
                                            <AlertTriangle size={22} />
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-white font-bold text-base capitalize">
                                                    {dispute.reason?.replace(/_/g, ' ') || 'Order Issue'}
                                                </h3>
                                                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-white">
                                                    {dispute.orderId}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${
                                                    isPending
                                                        ? 'text-primary bg-primary/10 border-primary/30'
                                                        : isDismissed
                                                            ? 'text-orange-500 bg-orange-500/10 border-orange-500/30'
                                                            : 'text-green-500 bg-green-500/10 border-green-500/30'
                                                }`}>
                                                    {dispute.status}
                                                </span>
                                                {dispute.flaggedAsFraud && (
                                                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border text-red-500 bg-red-500/10 border-red-500/30">
                                                        fraud flag
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-white/50 mt-1">
                                                Raised by{' '}
                                                <span className="text-white font-medium">{initiatorName}</span>
                                                {' '}against{' '}
                                                <span className="text-white font-medium">{respondentName}</span>
                                            </p>

                                            {dispute.description && (
                                                <p className="text-xs text-white/30 mt-1.5 line-clamp-2">{dispute.description}</p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-white/40">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    {new Date(dispute.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <MessageSquare size={12} />
                                                    {dispute.messages?.length || 0} messages
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Section - Action Button */}
                                    <div className="shrink-0">
                                        {isPending ? (
                                            <Button
                                                onClick={() => dispatch(setSelectedDispute(dispute))}
                                                variant="primary"
                                                size="sm"
                                            >
                                                Resolve Case
                                            </Button>
                                        ) : (
                                            <div className={`flex items-center gap-1.5 text-xs font-bold ${
                                                isDismissed ? 'text-orange-500' : 'text-green-500'
                                            }`}>
                                                {isDismissed ? (
                                                    <><AlertTriangle size={15} /> Dismissed</>
                                                ) : (
                                                    <><CheckCircle size={15} /> Resolved</>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PageLayout>

            {/* Resolution Modal */}
            {selectedDispute && (
                <ResolutionModal
                    dispute={selectedDispute}
                    onClose={() => {
                        dispatch(clearSelectedDispute());
                        dispatch(clearResolveStatus());
                    }}
                    resolveStatus={resolveStatus}
                    resolveError={resolveError}
                />
            )}
        </>
    );
}