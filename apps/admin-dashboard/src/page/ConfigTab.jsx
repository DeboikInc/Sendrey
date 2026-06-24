import { useEffect, useState, useCallback } from 'react';
import {
    Save, RotateCcw, AlertTriangle, Plus, Trash2, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';
import api from '../utils/api';

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
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:border-white/20 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all ${confirmVariant === 'destructive' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange hover:bg-orange/80'
                            }`}
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
            <label className="block text-[10px] text-white/30 tracking-widest uppercase font-medium mb-1.5">
                {label}
            </label>
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

function FleetRuleCard({ fleetKey, label, rule, onChange }) {
    return (
        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="text-white font-medium text-sm">{label}</div>
            <div className="grid grid-cols-2 gap-3">
                <NumberField
                    label="Base Fee"
                    value={rule.baseFee}
                    suffix="₦"
                    onChange={v => onChange(fleetKey, 'baseFee', v)}
                />
                <NumberField
                    label="Rate / km"
                    value={rule.ratePerKm}
                    suffix="₦"
                    onChange={v => onChange(fleetKey, 'ratePerKm', v)}
                />
            </div>
        </div>
    );
}

const FLEET_LABELS = {
    bike: 'Bike',
    cycling: 'Cycling',
    car: 'Car',
    van: 'Van',
    default: 'Default (fallback)',
};

export default function ConfigTab() {
    const [config, setConfig] = useState(null);
    const [originalConfig, setOriginalConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [matchingConfig, setMatchingConfig] = useState(null);
    const [originalMatchingConfig, setOriginalMatchingConfig] = useState(null);
    const NairaSign = '₦'

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/pricing/pricing-config');
            setConfig(res.data);
            setOriginalConfig(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load pricing config');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMatchingConfig = useCallback(async () => {
        try {
            const res = await api.get('/distance/get-config');
            setMatchingConfig(res.data);
            setOriginalMatchingConfig(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load matching config');
        }
    }, []);

    useEffect(() => { fetchConfig(); fetchMatchingConfig(); }, [fetchConfig, fetchMatchingConfig]);

    const hasChanges = config && originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);

    const handleFleetChange = (fleetKey, field, value) => {
        setConfig(prev => ({
            ...prev,
            fleetRules: {
                ...prev.fleetRules,
                [fleetKey]: { ...prev.fleetRules[fleetKey], [field]: value },
            },
        }));
    };

    const handleTierChange = (index, field, value) => {
        setConfig(prev => {
            const tiers = [...prev.pedestrianTiers];
            tiers[index] = { ...tiers[index], [field]: value };
            return { ...prev, pedestrianTiers: tiers };
        });
    };

    const handleAddTier = () => {
        setConfirm({
            title: 'Add Tier',
            message: 'Add a new pedestrian tier with 0 distance and 0 fee. You can edit the values after adding.',
            confirmLabel: 'Add Tier',
            confirmVariant: 'primary',
            onConfirm: () => {
                setConfig(prev => ({
                    ...prev,
                    pedestrianTiers: [...prev.pedestrianTiers, { maxDistanceMeters: 0, fee: 0 }],
                }));
                setConfirm(null);
            },
        });
    };

    const handleRemoveTier = (index) => {
        const tier = config.pedestrianTiers[index];
        setConfirm({
            title: 'Remove Tier',
            message: `Remove tier "${tier.maxDistanceMeters}m - ₦${tier.fee}"? This action cannot be undone.`,
            confirmLabel: 'Remove',
            confirmVariant: 'destructive',
            onConfirm: () => {
                setConfig(prev => ({
                    ...prev,
                    pedestrianTiers: prev.pedestrianTiers.filter((_, i) => i !== index),
                }));
                setConfirm(null);
            },
        });
    };

    const handleSectionSave = (sectionName) => {
        setConfirm({
            title: `Save ${sectionName}`,
            message: `Save changes to ${sectionName}? These changes take effect immediately.`,
            confirmLabel: 'Save Changes',
            confirmVariant: 'primary',
            onConfirm: async () => {
                setConfirm(null);
                setSaving(true);
                setError(null);
                try {
                    const res = await api.put('/pricing/pricing-config', config);
                    setConfig(res.data);
                    setOriginalConfig(res.data);
                } catch (err) {
                    setError(err.response?.data?.message || `Failed to save ${sectionName}`);
                } finally {
                    setSaving(false);
                }
            },
        });
    };

    const handleMatchingConfigSave = () => {
        setConfirm({
            title: 'Save Matching Distances',
            message: 'Save changes to matching distance caps? These changes take effect immediately.',
            confirmLabel: 'Save Changes',
            confirmVariant: 'primary',
            onConfirm: async () => {
                setConfirm(null);
                setSaving(true);
                setError(null);
                try {
                    const res = await api.put('/distance/put-config', matchingConfig);
                    setMatchingConfig(res.data);
                    setOriginalMatchingConfig(res.data);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to save matching config');
                } finally {
                    setSaving(false);
                }
            },
        });
    };

    const handleSave = () => {
        setConfirm({
            title: 'Save All Changes',
            message: 'These changes take effect immediately for new pricing calculations across the app. Continue?',
            confirmLabel: 'Save All',
            confirmVariant: 'primary',
            onConfirm: async () => {
                setConfirm(null);
                setSaving(true);
                setError(null);
                try {
                    const res = await api.put('/pricing/pricing-config', config);
                    setConfig(res.data);
                    setOriginalConfig(res.data);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to save pricing config');
                } finally {
                    setSaving(false);
                }
            },
        });
    };

    const handleDiscard = () => {
        setConfirm({
            title: 'Discard Changes',
            message: 'Revert all unsaved edits back to the last saved config?',
            confirmLabel: 'Discard',
            confirmVariant: 'destructive',
            onConfirm: () => { setConfig(originalConfig); setConfirm(null); },
        });
    };

    const stats = config ? [
        { label: 'Platform Fee', value: `${Math.round(config.platformFeePercentage * 100)}%`, icon: NairaSign, bgClass: 'bg-primary/10', borderClass: 'border-primary/20', textClass: 'text-primary', iconClass: 'text-primary' },
        { label: 'Pedestrian Platform Fee', value: `${Math.round(config.platformFeePercentagePedestrian * 100)}%`, icon: NairaSign, bgClass: 'bg-green-500/10', borderClass: 'border-green-500/20', textClass: 'text-green-500', iconClass: 'text-green-500' },
        { label: 'Config Version', value: config.version ?? '—', icon: AlertTriangle, bgClass: 'bg-orange/10', borderClass: 'border-orange/20', textClass: 'text-primary', iconClass: 'text-primary' },
    ] : [];

    // Check if individual sections have changes
    const platformFeesChanged = config && originalConfig && (
        config.platformFeePercentage !== originalConfig.platformFeePercentage ||
        config.platformFeePercentagePedestrian !== originalConfig.platformFeePercentagePedestrian
    );

    const providerFeesChanged = config && originalConfig && (
        config.paystackFeePercent !== originalConfig.paystackFeePercent ||
        config.paystackFeeCap !== originalConfig.paystackFeeCap
    );

    const fleetRatesChanged = config && originalConfig && (
        JSON.stringify(config.fleetRules) !== JSON.stringify(originalConfig.fleetRules)
    );

    const pedestrianTiersChanged = config && originalConfig && (
        JSON.stringify(config.pedestrianTiers) !== JSON.stringify(originalConfig.pedestrianTiers)
    );

    const matchingConfigChanged = matchingConfig && originalMatchingConfig && (
        matchingConfig.pickupMaxDistance !== originalMatchingConfig.pickupMaxDistance ||
        matchingConfig.totalMaxDistance !== originalMatchingConfig.totalMaxDistance
    );

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
                title="Pricing Config"
                icon={NairaSign}
                description="Control delivery fee rates and platform fee percentages"
                stats={stats}
                onRefresh={fetchConfig}
                isRefreshing={loading}
                toolbar={
                    hasChanges && (
                        <div className="flex items-center gap-2">
                            <Button onClick={handleDiscard} variant="outline" size="sm" leftIcon={<RotateCcw size={13} />}>
                                Discard
                            </Button>
                            <Button onClick={handleSave} variant="primary" size="sm" leftIcon={<Save size={13} />} disabled={saving}>
                                {saving ? 'Saving...' : 'Save All'}
                            </Button>
                        </div>
                    )
                }
            >
                {error && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                        <AlertTriangle size={13} /> {error}
                    </div>
                )}

                {hasChanges && (
                    <div className="mb-4 bg-primary/10 border border-primary/20 px-4 py-3 rounded-xl flex justify-between items-center">
                        <span className="text-primary text-sm font-medium">You have unsaved changes</span>
                    </div>
                )}

                {loading && (
                    <div className="p-10 text-center text-white/30 text-sm">Loading pricing config...</div>
                )}

                {!loading && !config && !error && (
                    <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                        <p className="text-white/40 text-sm">No pricing config found</p>
                    </div>
                )}

                {!loading && config && (
                    <div className="space-y-6">

                        {/* Platform fee percentages */}
                        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-white font-medium text-sm">Platform Fees</div>
                                {platformFeesChanged && (
                                    <Button
                                        onClick={() => handleSectionSave('Platform Fees')}
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<Save size={13} />}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <NumberField
                                    label="Platform Fee %"
                                    value={Math.round(config.platformFeePercentage * 100)}
                                    suffix="%"
                                    onChange={v => setConfig(prev => ({ ...prev, platformFeePercentage: v === '' ? '' : v / 100 }))}
                                />
                                <NumberField
                                    label="Pedestrian Platform Fee %"
                                    value={Math.round(config.platformFeePercentagePedestrian * 100)}
                                    suffix="%"
                                    onChange={v => setConfig(prev => ({ ...prev, platformFeePercentagePedestrian: v === '' ? '' : v / 100 }))}
                                />
                            </div>
                        </div>

                        {/* Paystack fees */}
                        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-white font-medium text-sm">Provider Fees (Paystack)</div>
                                {providerFeesChanged && (
                                    <Button
                                        onClick={() => handleSectionSave('Provider Fees')}
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<Save size={13} />}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <NumberField
                                    label="Provider Fee %"
                                    step={0.01}
                                    value={Math.round(config.paystackFeePercent * 10000) / 100}
                                    suffix="%"
                                    onChange={v => setConfig(prev => ({ ...prev, paystackFeePercent: v === '' ? '' : v / 100 }))}
                                />
                                <NumberField
                                    label="Provider Fee Cap"
                                    suffix="₦"
                                    value={config.paystackFeeCap}
                                    onChange={v => setConfig(prev => ({ ...prev, paystackFeeCap: v }))}
                                />
                            </div>
                        </div>

                        {/* Fleet rules */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <div className="text-white font-medium text-sm">Fleet Rates</div>
                                {fleetRatesChanged && (
                                    <Button
                                        onClick={() => handleSectionSave('Fleet Rates')}
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<Save size={13} />}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.keys(config.fleetRules).map(key => (
                                    <FleetRuleCard
                                        key={key}
                                        fleetKey={key}
                                        label={FLEET_LABELS[key] || key}
                                        rule={config.fleetRules[key]}
                                        onChange={handleFleetChange}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Pedestrian tiers */}
                        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-white font-medium text-sm">Pedestrian Tiers</div>
                                <div className="flex items-center gap-2">
                                    {pedestrianTiersChanged && (
                                        <Button
                                            onClick={() => handleSectionSave('Pedestrian Tiers')}
                                            variant="primary"
                                            size="sm"
                                            leftIcon={<Save size={13} />}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    )}
                                    <button
                                        onClick={handleAddTier}
                                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                    >
                                        <Plus size={13} /> Add tier
                                    </button>
                                </div>
                            </div>
                            <p className="text-white/40 text-xs -mt-2">
                                Sorted ascending by max distance. Distances beyond the last tier are rejected as too far.
                            </p>
                            <div className="space-y-2">
                                {config.pedestrianTiers.map((tier, i) => (
                                    <div key={i} className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <NumberField
                                                label="Max Distance (M)"
                                                suffix="m"
                                                value={tier.maxDistanceMeters}
                                                onChange={v => handleTierChange(i, 'maxDistanceMeters', v)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <NumberField
                                                label="Fee"
                                                suffix="₦"
                                                value={tier.fee}
                                                onChange={v => handleTierChange(i, 'fee', v)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveTier(i)}
                                            className="p-2.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* distance comfigurations */}
                        {matchingConfig && (
                            <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-white font-medium text-sm">Distances</div>
                                    {matchingConfigChanged && (
                                        <Button
                                            onClick={handleMatchingConfigSave}
                                            variant="primary"
                                            size="sm"
                                            leftIcon={<Save size={13} />}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    )}
                                </div>
                                <p className="text-white/40 text-xs -mt-2">
                                    All distances in meters (1000M - 1KM).
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <NumberField
                                        label="Runner to Pickup/Market Max Distance"
                                        suffix="m"
                                        value={matchingConfig.pickupMaxDistance}
                                        onChange={v => setMatchingConfig(prev => ({ ...prev, pickupMaxDistance: v }))}
                                    />
                                    <NumberField
                                        label="Total Max Distance (Pedestrian)"
                                        suffix="m"
                                        value={matchingConfig.totalMaxDistance}
                                        onChange={v => setMatchingConfig(prev => ({ ...prev, totalMaxDistance: v }))}
                                    />
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </PageLayout>
        </>
    );
}