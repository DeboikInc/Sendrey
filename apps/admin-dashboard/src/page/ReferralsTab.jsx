import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Save, RotateCcw, AlertTriangle, X, Users, ArrowRight, Gift } from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';
import {
    getAllReferrals,
    getReferralConfig,
    updateReferralConfig,
} from '../Redux/referralSlice';

function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', confirmVariant = 'primary', onConfirm, onCancel }) {
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
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:border-white/20 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${confirmVariant === 'destructive' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary hover:bg-primary/80 text-white'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function NumberField({ label, value, onChange, suffix, step = 1 }) {
    return (
        <div>
            <label className="block text-[10px] text-white/30 tracking-widest uppercase font-medium mb-1.5">{label}</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-primary/40 transition-colors">
                <input
                    type="number"
                    step={step}
                    value={value}
                    onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="bg-transparent text-sm text-white/80 outline-none w-full"
                />
                {suffix && <span className="text-xs text-white/30 shrink-0">{suffix}</span>}
            </div>
        </div>
    );
}

// Inline section action bar — same shape as ConfigTab's SectionActions
function SectionActions({ changed, saving, onSave, onCancel }) {
    if (!changed) return null;
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
            >
                <RotateCcw size={12} /> Cancel
            </button>
            <Button onClick={onSave} variant="primary" size="sm" leftIcon={<Save size={13} />} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>
    );
}

const STATUS_FILTERS = [
    { key: undefined, label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'completed', label: 'Completed' },
];

const STATUS_STYLES = {
    pending: 'bg-white/5 border-white/10 text-white/40',
    processing: 'bg-orange/10 border-orange/20 text-orange',
    completed: 'bg-green-500/10 border-green-500/20 text-green-500',
};

function displayName(person, model) {
    if (!person) return 'Unknown';
    const name = `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.firstName;
    return name || (model === 'Runner' ? 'Runner' : 'User');
}

export default function ReferralsTab() {
    const dispatch = useDispatch();
    const { referrals, total, page, limit, config, loading, configLoading, updating, error } = useSelector(state => state.referrals);

    const [statusFilter, setStatusFilter] = useState(undefined);
    const [confirm, setConfirm] = useState(null);
    const [bonusDraft, setBonusDraft] = useState('');

    useEffect(() => {
        dispatch(getReferralConfig());
    }, [dispatch]);

    useEffect(() => {
        dispatch(getAllReferrals({ status: statusFilter, page: 1, limit }));
    }, [dispatch, statusFilter, limit]);

    useEffect(() => {
        if (config && bonusDraft === '') setBonusDraft(config.bonusAmount);
    }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

    const bonusChanged = config && bonusDraft !== '' && Number(bonusDraft) !== config.bonusAmount;

    const handleBonusSave = () => {
        setConfirm({
            title: 'Save Referral Bonus',
            message: `Set the referral bonus to ₦${bonusDraft}? This applies to every future referral completion.`,
            confirmLabel: 'Save Changes',
            confirmVariant: 'primary',
            onConfirm: () => {
                setConfirm(null);
                dispatch(updateReferralConfig(Number(bonusDraft)));
            },
        });
    };

    const handleBonusCancel = () => setBonusDraft(config?.bonusAmount ?? '');

    const handlePageChange = (nextPage) => {
        dispatch(getAllReferrals({ status: statusFilter, page: nextPage, limit }));
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const stats = [
        { label: 'Total Referrals', value: total, icon: Users, bgClass: 'bg-primary/10', borderClass: 'border-primary/20', textClass: 'text-primary', iconClass: 'text-primary' },
        { label: 'Current Bonus', value: config ? `₦${config.bonusAmount.toLocaleString()}` : '—', icon: Gift, bgClass: 'bg-green-500/10', borderClass: 'border-green-500/20', textClass: 'text-green-500', iconClass: 'text-green-500' },
    ];

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
                title="Referrals"
                icon={Users}
                description="Track who referred who and configure the referral bonus"
                stats={stats}
                onRefresh={() => {
                    dispatch(getReferralConfig());
                    dispatch(getAllReferrals({ status: statusFilter, page, limit }));
                }}
                isRefreshing={loading || configLoading}
            >
                {error && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                        <AlertTriangle size={13} /> {error}
                    </div>
                )}

                <div className="space-y-6">

                    {/* Referral Bonus config */}
                    <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-white font-medium text-sm">Referral Bonus</div>
                            <SectionActions
                                changed={bonusChanged}
                                saving={updating}
                                onSave={handleBonusSave}
                                onCancel={handleBonusCancel}
                            />
                        </div>
                        <p className="text-white/40 text-xs -mt-2">
                            Paid to the referrer once the person they referred completes their first order. Set to 0 to disable payouts.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <NumberField
                                label="Bonus Amount"
                                suffix="₦"
                                value={bonusDraft}
                                onChange={setBonusDraft}
                            />
                        </div>
                    </div>

                    {/* Referral feed */}
                    <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-white font-medium text-sm">All Referrals</div>
                            <div className="flex items-center gap-1.5">
                                {STATUS_FILTERS.map(({ key, label }) => (
                                    <button
                                        key={label}
                                        onClick={() => setStatusFilter(key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === key
                                            ? 'bg-primary/10 border border-primary/20 text-primary'
                                            : 'text-white/40 hover:text-white border border-transparent'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading && (
                            <div className="p-10 text-center text-white/30 text-sm">Loading referrals...</div>
                        )}

                        {!loading && referrals.length === 0 && (
                            <div className="text-center py-14 bg-black/10 rounded-2xl border border-dashed border-white/10">
                                <p className="text-white/40 text-sm">No referrals found</p>
                            </div>
                        )}

                        {!loading && referrals.length > 0 && (
                            <div className="space-y-2">
                                {referrals.map(r => (
                                    <div
                                        key={r._id}
                                        className="flex items-center justify-between gap-3 bg-black/10 border border-white/10 rounded-xl px-4 py-3"
                                    >
                                        <div className="flex items-center gap-2 text-sm text-white/80 min-w-0">
                                            <span className="font-medium text-white truncate">
                                                {displayName(r.referrer, r.referrerModel)}
                                            </span>
                                            <span className="text-[10px] text-white/30 uppercase tracking-wide shrink-0">
                                                {r.referrerModel}
                                            </span>
                                            <p className='flex justify-center items-center gap-2'>
                                                Referred
                                                <ArrowRight size={13} className="text-white/20 shrink-0" />
                                            </p>
                                            <span className="font-medium text-white truncate">
                                                {displayName(r.referred, r.referredModel)}
                                            </span>
                                            <span className="text-[10px] text-white/30 uppercase tracking-wide shrink-0">
                                                {r.referredModel}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {r.status === 'completed' && (
                                                <span className="text-xs text-green-500 font-medium">
                                                    ₦{r.bonusAmount?.toLocaleString()}
                                                </span>
                                            )}
                                            <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-md border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                                                {r.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && totalPages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page <= 1}
                                    className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-white/30">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page >= totalPages}
                                    className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </PageLayout>
        </>
    );
}