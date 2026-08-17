import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { ChevronLeft, Plus, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
    getUserDisputes,
    getUserDisputeCategories,
    getUserDisputableOrders,
    raiseDispute,
    clearDispute,
} from '../../Redux/disputeSlice';

export default function UserDisputes({ darkMode, onBack, userId }) {
    const dispatch = useDispatch();
    const disputes = useSelector(s => s.dispute.disputes);
    const loading = useSelector(s => s.dispute.loading);
    const error = useSelector(s => s.dispute.error);

    const rawCategories = useSelector(s => s.dispute.categories, shallowEqual);
    const availableReasons = useMemo(
        () => (Array.isArray(rawCategories) ? rawCategories : []),
        [rawCategories]
    );

    const rawDisputableOrders = useSelector(s => s.dispute.disputableOrders, shallowEqual);
    const disputableOrders = useMemo(
        () => (Array.isArray(rawDisputableOrders) ? rawDisputableOrders : []),
        [rawDisputableOrders]
    );
    const disputableOrdersLoading = useSelector(s => s.dispute.disputableOrdersLoading);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ orderId: '', reason: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const getReasonLabel = (value) => {
        const found = availableReasons.find(r => r.value === value);
        if (found) return found.label;
        return value ? value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
    };

    // Orders already carrying a live dispute are excluded server-side,
    // so anything in this list is genuinely raisable right now.
    const canRaise = disputableOrders.length > 0 && !showForm;

    useEffect(() => {
        console.log('UserDisputes useEffect - userId:', userId);
        if (!userId) {
            console.log('No userId, skipping fetch');
            return;
        }
        console.log('Dispatching getUserDisputes for userId:', userId);

        dispatch(getUserDisputes(userId));
        dispatch(getUserDisputeCategories(userId));
        dispatch(getUserDisputableOrders(userId));
        return () => dispatch(clearDispute());
    }, [userId, dispatch]);

    useEffect(() => {
        if (form.reason && !availableReasons.find(r => r.value === form.reason)) {
            setForm(p => ({ ...p, reason: '' }));
        }
    }, [availableReasons, form.reason]);

    useEffect(() => {
        if (form.orderId && !disputableOrders.find(o => o.orderId === form.orderId)) {
            setForm(p => ({ ...p, orderId: '' }));
        }
    }, [disputableOrders, form.orderId]);

    const selectedOrder = useMemo(
        () => disputableOrders.find(o => o.orderId === form.orderId) ?? null,
        [disputableOrders, form.orderId]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.orderId) {
            setFormError('Please select an order.');
            return;
        }
        if (!form.reason.trim() || !form.description.trim()) {
            setFormError('Please fill in all fields.');
            return;
        }
        if (form.description.trim().length < 20) {
            setFormError('Please provide more detail (at least 20 characters).');
            return;
        }
        setSubmitting(true);
        try {
            await dispatch(raiseDispute({
                orderId: form.orderId,
                chatId: selectedOrder?.chatId ?? undefined,
                reason: form.reason.trim(),
                description: form.description.trim(),
            })).unwrap();
            setForm({ orderId: '', reason: '', description: '' });
            setShowForm(false);
            dispatch(getUserDisputes(userId));
            dispatch(getUserDisputableOrders(userId));
        } catch (err) {
            setFormError(err?.message || err?.response?.data?.message || 'Failed to raise dispute.');
        } finally {
            setSubmitting(false);
        }
    };

    const page = darkMode ? 'bg-black-100' : 'bg-gray-1000';
    const card = darkMode ? 'bg-black-100 border-white/10' : 'bg-white border-gray-200';
    const heading = darkMode ? 'text-white' : 'text-black-200';
    const ghost = darkMode ? 'border-white/10 text-gray-300' : 'border-gray-200 text-black-200';
    const inputCls = `w-full rounded-2xl px-5 py-4 text-sm focus:outline-none placeholder:text-black-100/80 border ${darkMode ? 'bg-black-200 border-white/10 text-white placeholder:text-gray-400' : 'bg-white border-gray-200 text-black-200 placeholder:text-black-100/80'
        }`;

    const statusIcon = (s) => ({
        open: <Clock className="h-4 w-4 text-primary" />,
        resolved: <CheckCircle className="h-4 w-4 text-green-400" />,
        dismissed: <XCircle className="h-4 w-4 text-orange-400" />,
        rejected: <XCircle className="h-4 w-4 text-red-400" />,
        under_review: <AlertCircle className="h-4 w-4 text-primary" />,
    }[s] ?? <AlertCircle className="h-4 w-4 text-black-100/80 dark:text-gray-500" />);

    const statusBadge = (s) => ({
        open: darkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary',
        resolved: darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
        dismissed: darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700',
        rejected: darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
        under_review: darkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary',
    }[s] ?? (darkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-black-100/80'));

    return (
        <div className={`h-screen flex flex-col transition-colors duration-300 ${page}`}>
            {/* Header */}
            <div className={`flex items-center gap-3 px-4 py-4 border-b flex-shrink-0 ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <button
                    onClick={onBack}
                    className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-black-200' : 'hover:bg-gray-100'}`}
                >
                    <ChevronLeft className={`w-5 h-5 ${heading}`} />
                </button>
                <div className="flex-1">
                    <h1 className={`text-lg font-bold ${heading}`}>Disputes</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black-100/80 dark:text-gray-500">
                        {disputableOrders.length > 0 ? 'Raise & track disputes' : 'Your dispute history'}
                    </p>
                </div>

                {canRaise && (
                    <button
                        onClick={() => setShowForm(true)}
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${ghost}`}
                    >
                        <Plus className="h-3 w-3" /> New
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                {disputableOrdersLoading && (
                    <p className="text-xs text-black-100/80 dark:text-gray-500 text-center py-2">
                        Checking which orders are eligible for a dispute…
                    </p>
                )}

                {/* ── Raise dispute form ─────────────────────────────────────── */}
                {showForm && (
                    <div className={`rounded-3xl p-6 border-2 border-dashed space-y-3 ${darkMode ? 'border-white/10' : 'border-gray-200'
                        }`}>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <select
                                value={form.orderId}
                                onChange={e => { setForm(p => ({ ...p, orderId: e.target.value })); setFormError(''); }}
                                className={inputCls}
                            >
                                <option value="">Select order</option>
                                {disputableOrders.map(o => (
                                    <option key={o.orderId} value={o.orderId}>
                                        {o.orderId}{o.serviceType ? ` — ${o.serviceType}` : ''}
                                    </option>
                                ))}
                            </select>
                            {selectedOrder?.disputeWindowExpiresAt && (
                                <p className="text-xs text-black-100/80 dark:text-gray-500 px-1">
                                    Dispute window closes {new Date(selectedOrder.disputeWindowExpiresAt).toLocaleString()}
                                </p>
                            )}

                            <select
                                value={form.reason}
                                onChange={e => { setForm(p => ({ ...p, reason: e.target.value })); setFormError(''); }}
                                className={inputCls}
                            >
                                <option value="">Select reason</option>
                                {availableReasons.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>

                            <textarea
                                rows={4}
                                placeholder={
                                    form.reason
                                        ? `Describe the "${availableReasons.find(r => r.value === form.reason)?.label}" issue in detail…`
                                        : 'Select an order and reason above, then describe what happened…'
                                }
                                value={form.description}
                                onChange={e => {
                                    setForm(p => ({ ...p, description: e.target.value.slice(0, 1000) }));
                                    setFormError('');
                                }}
                                className={`${inputCls} resize-none`}
                            />
                            <p className="text-[10px] text-black-100/80 dark:text-gray-500 text-right">{form.description.length}/1000</p>
                            {formError && <p className="text-xs text-red-400">{formError}</p>}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={submitting || !form.orderId || !form.reason || form.description.trim().length < 20}
                                    className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-red-500 text-white active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    {submitting ? 'Submitting…' : 'Submit Dispute'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setFormError(''); setForm({ orderId: '', reason: '', description: '' }); }}
                                    className={`px-6 rounded-2xl text-[11px] font-black uppercase border ${ghost}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {loading && (
                    <p className="text-xs text-black-100/80 dark:text-gray-500 text-center py-8">Loading disputes...</p>
                )}

                {error && (
                    <p className="text-xs text-red-400 text-center py-8">Failed to load disputes</p>
                )}

                {!loading && !error && disputes.length === 0 && !showForm && (
                    <div className={`rounded-3xl p-6 border ${card} text-center`}>
                        <AlertCircle className="h-8 w-8 text-black-100/80 dark:text-gray-500 mx-auto mb-3" />
                        <p className={`text-sm font-bold ${heading}`}>No disputes yet</p>
                        <p className="text-xs text-black-100/80 dark:text-gray-500 mt-1">
                            {disputableOrders.length > 0
                                ? 'You can raise a dispute on a completed order within its dispute window.'
                                : 'You can raise a dispute after an order is completed, within its dispute window.'}
                        </p>
                    </div>
                )}

                {disputes.map(dispute => (
                    <div key={dispute._id} className={`rounded-3xl p-5 border ${card} space-y-3`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {statusIcon(dispute.status)}
                                <p className={`text-sm font-bold ${heading}`}>
                                    {getReasonLabel(dispute.reason)}
                                </p>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${statusBadge(dispute.status)}`}>
                                {dispute.status?.replace('_', ' ') || 'pending'}
                            </span>
                        </div>

                        <p className="text-xs text-black-100/80 dark:text-gray-500 line-clamp-2">{dispute.description}</p>

                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-black-100/80 dark:text-gray-500">
                                Order: {dispute.orderId?.orderId || dispute.orderId}
                            </p>
                            <p className="text-[10px] text-black-100/80 dark:text-gray-500">
                                {dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString() : ''}
                            </p>
                        </div>

                        {dispute.resolution && (
                            <div className={`rounded-2xl p-3 ${darkMode ? 'bg-black-200' : 'bg-gray-100'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black-100/80 dark:text-gray-500 mb-2">
                                    Resolution
                                </p>
                                {dispute.resolution.outcome && (
                                    <p className="text-xs text-black-100/80 dark:text-gray-500 capitalize">
                                        <span className="font-bold">Outcome:</span> {dispute.resolution.outcome?.replace(/_/g, ' ')}
                                    </p>
                                )}
                                {dispute.resolution.amountToUser > 0 && (
                                    <p className="text-xs text-black-100/80 dark:text-gray-500 mt-1">
                                        <span className="font-bold">Refunded:</span> ₦{dispute.resolution.amountToUser?.toLocaleString()}
                                    </p>
                                )}
                                {dispute.resolution.notes && (
                                    <p className="text-xs text-black-100/80 dark:text-gray-500 mt-1">
                                        <span className="font-bold">Notes:</span> {dispute.resolution.notes}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}