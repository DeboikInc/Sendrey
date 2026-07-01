import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Save, RotateCcw, AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';
import {
    fetchPricingConfig, savePricingConfig,
    fetchMatchingConfig, saveMatchingConfig,
    fetchPlatformConfig, savePlatformConfig,
    fetchPedestrianConfig, savePedestrianConfig,
    updateField, updateFleetRule, updateTier, addTier, removeTier, discardChanges,
} from '../Redux/configSlice';

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
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${confirmVariant === 'destructive' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary hover:bg-primary/80 text-white'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function NumberField({ label, value, onChange, suffix, step = 1, readOnly = false }) {
    return (
        <div>
            <label className="block text-[10px] text-white/30 tracking-widest uppercase font-medium mb-1.5">{label}</label>
            <div className={`flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : 'focus-within:border-primary/40'}`}>
                <input
                    type="number"
                    step={step}
                    value={value}
                    readOnly={readOnly}
                    onChange={e => !readOnly && onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="bg-transparent text-sm text-white/80 outline-none w-full disabled:cursor-not-allowed"
                />
                {suffix && <span className="text-xs text-white/30 shrink-0">{suffix}</span>}
            </div>
        </div>
    );
}

function TextField({ label, value, onChange }) {
    return (
        <div>
            <label className="block text-[10px] text-white/30 tracking-widest uppercase font-medium mb-1.5">{label}</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-primary/40 transition-colors">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="bg-transparent text-sm text-white/80 outline-none w-full"
                />
            </div>
        </div>
    );
}

function FleetRuleCard({ fleetKey, label, rule, onChange }) {
    return (
        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="text-white font-medium text-sm">{label}</div>
            <div className="grid grid-cols-2 gap-3">
                <NumberField label="Base Fee" value={rule.baseFee} suffix="₦" onChange={v => onChange(fleetKey, 'baseFee', v)} />
                <NumberField label="Rate / km" value={rule.ratePerKm} suffix="₦" onChange={v => onChange(fleetKey, 'ratePerKm', v)} />
            </div>
        </div>
    );
}

// Inline section action bar — Cancel always shown when changed, Save only when not in multipleChanged mode
function SectionActions({ changed, multipleChanged, saving, onSave, onCancel }) {
    if (!changed) return null;
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
            >
                <RotateCcw size={12} /> Cancel
            </button>
            {!multipleChanged && (
                <Button onClick={onSave} variant="primary" size="sm" leftIcon={<Save size={13} />} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            )}
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
    const dispatch = useDispatch();
    const pricing = useSelector(state => state.config.pricing);
    const matching = useSelector(state => state.config.matching);
    const platform = useSelector(state => state.config.platform);
    const pedestrian = useSelector(state => state.config.pedestrian);
    const [confirm, setConfirm] = useState(null);
    const NairaSign = '₦';

    useEffect(() => {
        dispatch(fetchPricingConfig());
        dispatch(fetchMatchingConfig());
        dispatch(fetchPlatformConfig());
        dispatch(fetchPedestrianConfig());
    }, [dispatch]);

    const { data: config, original: originalConfig, loading, saving: savingPricing, error: pricingError } = pricing;
    const { data: matchingConfig, original: originalMatchingConfig, saving: savingMatching, error: matchingError } = matching;
    const { data: platformConfig, original: originalPlatformConfig, saving: savingPlatform, error: platformError } = platform;
    const { data: pedestrianConfig, original: originalPedestrianConfig, saving: savingPedestrian, error: pedestrianError } = pedestrian;

    const error = pricingError || matchingError || platformError || pedestrianError;

    // ── Changed flags ────────────────────────────────────────────────────────
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
    const pedestrianConfigChanged = pedestrianConfig && originalPedestrianConfig && (
        pedestrianConfig.pedestrianMaxRunnerLeg !== originalPedestrianConfig.pedestrianMaxRunnerLeg ||
        pedestrianConfig.pedestrianMaxDeliveryLeg !== originalPedestrianConfig.pedestrianMaxDeliveryLeg
    );
    const platformConfigChanged = platformConfig && originalPlatformConfig && (
        platformConfig.platformBankAccount !== originalPlatformConfig.platformBankAccount
    );

    // Count distinct changed sections across all resources
    const changedCount = [
        platformFeesChanged,
        providerFeesChanged,
        fleetRatesChanged,
        pedestrianTiersChanged,
        matchingConfigChanged,
        pedestrianConfigChanged,
        platformConfigChanged,
    ].filter(Boolean).length;

    const multipleChanged = changedCount > 1;

    // ── Discard helpers ──────────────────────────────────────────────────────
    const confirmDiscard = (resource, label) => {
        setConfirm({
            title: `Discard ${label}`,
            message: `Revert all unsaved changes to ${label}?`,
            confirmLabel: 'Discard',
            confirmVariant: 'destructive',
            onConfirm: () => { dispatch(discardChanges({ resource })); setConfirm(null); },
        });
    };

    const handleDiscardAll = () => {
        setConfirm({
            title: 'Discard All Changes',
            message: 'Revert all unsaved changes across every section?',
            confirmLabel: 'Discard All',
            confirmVariant: 'destructive',
            onConfirm: () => {
                dispatch(discardChanges({ resource: 'pricing' }));
                dispatch(discardChanges({ resource: 'matching' }));
                dispatch(discardChanges({ resource: 'pedestrian' }));
                dispatch(discardChanges({ resource: 'platform' }));
                setConfirm(null);
            },
        });
    };

    // ── Save helpers ─────────────────────────────────────────────────────────
    const handleSectionSave = (label) => {
        setConfirm({
            title: `Save ${label}`,
            message: `Save changes to ${label}? These changes take effect immediately.`,
            confirmLabel: 'Save Changes',
            confirmVariant: 'primary',
            onConfirm: () => { setConfirm(null); dispatch(savePricingConfig(config)); },
        });
    };

    const handleMatchingConfigSave = () => {
        setConfirm({
            title: 'Save Distances',
            message: 'Save changes to distance caps? These changes take effect immediately.',
            confirmLabel: 'Save Changes',
            confirmVariant: 'primary',
            onConfirm: () => {
                setConfirm(null);
                dispatch(saveMatchingConfig({
                    pickupMaxDistance: matchingConfig.pickupMaxDistance,
                    totalMaxDistance: matchingConfig.totalMaxDistance,
                }));
            },
        });
    };

    const handlePedestrianConfigSave = () => {
        const payload = {
            ...pedestrianConfig,
            pedestrianTotalMax: pedestrianConfig.pedestrianMaxRunnerLeg + pedestrianConfig.pedestrianMaxDeliveryLeg,
        };
        setConfirm({
            title: 'Save Pedestrian Distances',
            message: 'Save changes to pedestrian distance limits? These changes take effect immediately.',
            confirmLabel: 'Save Changes',
            confirmVariant: 'primary',
            onConfirm: () => { setConfirm(null); dispatch(savePedestrianConfig(payload)); },
        });
    };

    const handlePlatformConfigSave = () => {
        setConfirm({
            title: 'Save Platform Bank Account',
            message: 'Update the platform settlement bank account? This affects where future settlements are sent.',
            confirmLabel: 'Save Changes',
            confirmVariant: 'primary',
            onConfirm: () => { setConfirm(null); dispatch(savePlatformConfig(platformConfig)); },
        });
    };

    const handleSaveAll = () => {
        setConfirm({
            title: 'Save All Changes',
            message: 'Save all pending changes across every section? These take effect immediately.',
            confirmLabel: 'Save All',
            confirmVariant: 'primary',
            onConfirm: () => {
                setConfirm(null);
                const pricingDirty = platformFeesChanged || providerFeesChanged || fleetRatesChanged || pedestrianTiersChanged;
                if (pricingDirty) dispatch(savePricingConfig(config));
                if (matchingConfigChanged) dispatch(saveMatchingConfig({ pickupMaxDistance: matchingConfig.pickupMaxDistance }));
                if (pedestrianConfigChanged) {
                    dispatch(savePedestrianConfig({
                        ...pedestrianConfig,
                        pedestrianTotalMax: pedestrianConfig.pedestrianMaxRunnerLeg + pedestrianConfig.pedestrianMaxDeliveryLeg,
                    }));
                }
                if (platformConfigChanged) dispatch(savePlatformConfig(platformConfig));
            },
        });
    };

    const stats = config ? [
        { label: 'Platform Fee', value: `${Math.round(config.platformFeePercentage * 100)}%`, icon: NairaSign, bgClass: 'bg-primary/10', borderClass: 'border-primary/20', textClass: 'text-primary', iconClass: 'text-primary' },
        { label: 'Pedestrian Platform Fee', value: `${Math.round(config.platformFeePercentagePedestrian * 100)}%`, icon: NairaSign, bgClass: 'bg-green-500/10', borderClass: 'border-green-500/20', textClass: 'text-green-500', iconClass: 'text-green-500' },
        { label: 'Config Version', value: config.version ?? '—', icon: AlertTriangle, bgClass: 'bg-orange/10', borderClass: 'border-orange/20', textClass: 'text-primary', iconClass: 'text-primary' },
    ] : [];

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
                title="Config"
                icon={NairaSign}
                description="Control delivery fee rates, platform fee percentages and distance configurations"
                stats={stats}
                onRefresh={() => {
                    dispatch(fetchPricingConfig());
                    dispatch(fetchMatchingConfig());
                    dispatch(fetchPlatformConfig());
                    dispatch(fetchPedestrianConfig());
                }}
                isRefreshing={loading}
                toolbar={
                    multipleChanged && (
                        <div className="flex items-center gap-2">
                            <Button onClick={handleDiscardAll} variant="outline" size="sm" leftIcon={<RotateCcw size={13} />}>
                                Discard All
                            </Button>
                            <Button onClick={handleSaveAll} variant="primary" size="sm" leftIcon={<Save size={13} />}>
                                Save All
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

                {multipleChanged && (
                    <div className="mb-4 bg-primary/10 border border-primary/20 px-4 py-3 rounded-xl flex justify-between items-center">
                        <span className="text-primary text-sm font-medium">{changedCount} sections have unsaved changes</span>
                    </div>
                )}

                {loading && (
                    <div className="p-10 text-center text-white/30 text-sm">Loading config...</div>
                )}

                {!loading && !config && !error && (
                    <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-white/10">
                        <p className="text-white/40 text-sm">No config found</p>
                    </div>
                )}

                {!loading && config && (
                    <div className="space-y-6">

                        {/* Platform Fees */}
                        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-white font-medium text-sm">Platform Fees</div>
                                <SectionActions
                                    changed={platformFeesChanged}
                                    multipleChanged={multipleChanged}
                                    saving={savingPricing}
                                    onSave={() => handleSectionSave('Platform Fees')}
                                    onCancel={() => confirmDiscard('pricing', 'Platform Fees')}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <NumberField
                                    label="Platform Fee %"
                                    value={Math.round(config.platformFeePercentage * 100)}
                                    suffix="%"
                                    onChange={v => dispatch(updateField({ resource: 'pricing', field: 'platformFeePercentage', value: v === '' ? '' : v / 100 }))}
                                />
                                <NumberField
                                    label="Pedestrian Platform Fee %"
                                    value={Math.round(config.platformFeePercentagePedestrian * 100)}
                                    suffix="%"
                                    onChange={v => dispatch(updateField({ resource: 'pricing', field: 'platformFeePercentagePedestrian', value: v === '' ? '' : v / 100 }))}
                                />
                            </div>
                        </div>

                        {/* Provider Fees */}
                        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-white font-medium text-sm">Provider Fees (Paystack)</div>
                                <SectionActions
                                    changed={providerFeesChanged}
                                    multipleChanged={multipleChanged}
                                    saving={savingPricing}
                                    onSave={() => handleSectionSave('Provider Fees')}
                                    onCancel={() => confirmDiscard('pricing', 'Provider Fees')}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <NumberField
                                    label="Provider Fee %"
                                    step={0.01}
                                    value={Math.round(config.paystackFeePercent * 10000) / 100}
                                    suffix="%"
                                    onChange={v => dispatch(updateField({ resource: 'pricing', field: 'paystackFeePercent', value: v === '' ? '' : v / 100 }))}
                                />
                                <NumberField
                                    label="Provider Fee Cap"
                                    suffix="₦"
                                    value={config.paystackFeeCap}
                                    onChange={v => dispatch(updateField({ resource: 'pricing', field: 'paystackFeeCap', value: v }))}
                                />
                            </div>
                        </div>

                        {/* Fleet Rates */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <div className="text-white font-medium text-sm">Fleet Rates</div>
                                <SectionActions
                                    changed={fleetRatesChanged}
                                    multipleChanged={multipleChanged}
                                    saving={savingPricing}
                                    onSave={() => handleSectionSave('Fleet Rates')}
                                    onCancel={() => confirmDiscard('pricing', 'Fleet Rates')}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.keys(config.fleetRules).map(key => (
                                    <FleetRuleCard
                                        key={key}
                                        fleetKey={key}
                                        label={FLEET_LABELS[key] || key}
                                        rule={config.fleetRules[key]}
                                        onChange={(fk, field, value) => dispatch(updateFleetRule({ fleetKey: fk, field, value }))}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Pedestrian Tiers */}
                        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-white font-medium text-sm">Pedestrian Tiers</div>
                                <div className="flex items-center gap-2">
                                    <SectionActions
                                        changed={pedestrianTiersChanged}
                                        multipleChanged={multipleChanged}
                                        saving={savingPricing}
                                        onSave={() => handleSectionSave('Pedestrian Tiers')}
                                        onCancel={() => confirmDiscard('pricing', 'Pedestrian Tiers')}
                                    />
                                    <button onClick={() => setConfirm({
                                        title: 'Add Tier',
                                        message: 'Add a new pedestrian tier with 0 distance and 0 fee.',
                                        confirmLabel: 'Add Tier',
                                        confirmVariant: 'primary',
                                        onConfirm: () => { dispatch(addTier()); setConfirm(null); },
                                    })} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                                        <Plus size={13} /> Add tier
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {config.pedestrianTiers.map((tier, i) => (
                                    <div key={i} className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <NumberField label="Max Distance (M)" suffix="m" value={tier.maxDistanceMeters} onChange={v => dispatch(updateTier({ index: i, field: 'maxDistanceMeters', value: v }))} />
                                        </div>
                                        <div className="flex-1">
                                            <NumberField label="Fee" suffix="₦" value={tier.fee} onChange={v => dispatch(updateTier({ index: i, field: 'fee', value: v }))} />
                                        </div>
                                        <button onClick={() => setConfirm({
                                            title: 'Remove Tier',
                                            message: `Remove tier "${tier.maxDistanceMeters}m - ₦${tier.fee}"? This cannot be undone.`,
                                            confirmLabel: 'Remove',
                                            confirmVariant: 'destructive',
                                            onConfirm: () => { dispatch(removeTier(i)); setConfirm(null); },
                                        })} className="p-2.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Distances */}
                        {matchingConfig && (
                            <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-white font-medium text-sm">Distances</div>
                                    <SectionActions
                                        changed={matchingConfigChanged}
                                        multipleChanged={multipleChanged}
                                        saving={savingMatching}
                                        onSave={handleMatchingConfigSave}
                                        onCancel={() => confirmDiscard('matching', 'Distances')}
                                    />
                                </div>
                                <p className="text-white/40 text-xs -mt-2">Distances for all fleet types. All distances in meters (1000M = 1KM).</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <NumberField
                                        label="Runner to Pickup / Market to Delivery Max"
                                        suffix="m"
                                        value={matchingConfig.pickupMaxDistance}
                                        onChange={v => dispatch(updateField({ resource: 'matching', field: 'pickupMaxDistance', value: v }))}
                                    />
                                    <NumberField
                                        label="Total Max Distance (Pedestrian)"
                                        suffix="m"
                                        readOnly
                                        value={(pedestrianConfig?.pedestrianMaxRunnerLeg || 0) + (pedestrianConfig?.pedestrianMaxDeliveryLeg || 0)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Pedestrian Distances */}
                        {pedestrianConfig && (
                            <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-white font-medium text-sm">Pedestrian Distances</div>
                                    <SectionActions
                                        changed={pedestrianConfigChanged}
                                        multipleChanged={multipleChanged}
                                        saving={savingPedestrian}
                                        onSave={handlePedestrianConfigSave}
                                        onCancel={() => confirmDiscard('pedestrian', 'Pedestrian Distances')}
                                    />
                                </div>
                                <p className="text-white/40 text-xs -mt-2">Caps used to validate pedestrian errands. Total Max is derived from Runner + Delivery legs.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <NumberField
                                        label="Max Runner Leg"
                                        suffix="m"
                                        value={pedestrianConfig.pedestrianMaxRunnerLeg}
                                        onChange={v => {
                                            dispatch(updateField({ resource: 'pedestrian', field: 'pedestrianMaxRunnerLeg', value: v }));
                                            dispatch(updateField({ resource: 'matching', field: 'totalMaxDistance', value: v + (pedestrianConfig.pedestrianMaxDeliveryLeg || 0) }));
                                        }}
                                    />
                                    <NumberField
                                        label="Max Delivery Leg"
                                        suffix="m"
                                        value={pedestrianConfig.pedestrianMaxDeliveryLeg}
                                        onChange={v => {
                                            dispatch(updateField({ resource: 'pedestrian', field: 'pedestrianMaxDeliveryLeg', value: v }));
                                            dispatch(updateField({ resource: 'matching', field: 'totalMaxDistance', value: (pedestrianConfig.pedestrianMaxRunnerLeg || 0) + v }));
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Platform Settlement */}
                        {platformConfig && (
                            <div className="bg-secondary/30 border border-white/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-white font-medium text-sm">Platform Fee Settlement Account</div>
                                    <SectionActions
                                        changed={platformConfigChanged}
                                        multipleChanged={multipleChanged}
                                        saving={savingPlatform}
                                        onSave={handlePlatformConfigSave}
                                        onCancel={() => confirmDiscard('platform', 'Platform Settlement Account')}
                                    />
                                </div>
                                <p className="text-white/40 text-xs -mt-2">Account where settlement transfers are sent.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <TextField
                                        label="Platform Bank Account"
                                        value={platformConfig.platformBankAccount}
                                        onChange={v => dispatch(updateField({ resource: 'platform', field: 'platformBankAccount', value: v }))}
                                    />
                                    {platformConfig.accountName && (
                                        <div className="text-xs text-white/40">
                                            Resolved: <span className="text-white/70">{platformConfig.accountName}</span> — {platformConfig.bankName}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </PageLayout>
        </>
    );
}