// utils/disputeReasons.js (SERVER - complete version)

/**
 * disputeReasons.js
 * Server-side - exact mirror of client/src/utils/disputeReasons.js
 * Single source of truth for dispute reasons.
 */

// ─── USER reasons for run-errand orders ─────────────────────────────────────
const RUN_ERRAND_REASONS = [
    {
        value: 'item_not_delivered',
        label: 'Item not delivered',
        description: 'Runner marked as delivered but item never arrived',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['delivered', 'task_completed', 'completed'],
    },
    {
        value: 'item_damaged_in_transit',
        label: 'Item damaged in transit',
        description: 'Item arrived visibly damaged after collection',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['completed'],
    },
    {
        value: 'runner_misconduct',
        label: 'Runner misconduct',
        description: 'Unprofessional, threatening, or abusive behaviour',
        windowClosesAfter: [],
    },
    {
        value: 'runner_unresponsive',
        label: 'Runner went offline / unresponsive',
        description: 'Runner stopped communicating mid-order',
        windowClosesAfter: ['task_completed', 'completed'],
    },
    {
        value: 'other',
        label: 'Other',
        description: 'Something else not listed above',
        windowClosesAfter: [],
    },
];

// ─── USER reasons for pick-up orders ────────────────────────────────────────
const PICK_UP_REASONS = [
    {
        value: 'item_not_collected',
        label: 'Item not collected',
        description: 'Runner claimed to collect but item was not picked up',
        windowClosesAfter: [
            'en_route_to_delivery',
            'arrived_at_delivery_location',
            'delivered',
            'task_completed',
            'completed',
        ],
    },
    {
        value: 'wrong_item_collected',
        label: 'Wrong item collected',
        description: 'Runner picked up a different item from the specified location',
        windowClosesAfter: [
            'en_route_to_delivery',
            'arrived_at_delivery_location',
            'delivered',
            'task_completed',
            'completed',
        ],
    },
    {
        value: 'item_not_delivered',
        label: 'Item not delivered',
        description: 'Runner marked as delivered but item never arrived',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['delivered', 'task_completed', 'completed'],
    },
    {
        value: 'item_damaged_in_transit',
        label: 'Item damaged in transit',
        description: 'Item arrived visibly damaged after collection',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['completed'],
    },
    {
        value: 'runner_misconduct',
        label: 'Runner misconduct',
        description: 'Unprofessional, threatening, or abusive behaviour',
        windowClosesAfter: [],
    },
    {
        value: 'runner_unresponsive',
        label: 'Runner went offline / unresponsive',
        description: 'Runner stopped communicating mid-order',
        windowClosesAfter: ['task_completed', 'completed'],
    },
    {
        value: 'other',
        label: 'Other',
        description: 'Something else not listed above',
        windowClosesAfter: [],
    },
];

// ─── RUNNER reasons for pick-up orders ───────────────────────────────────────
const RUNNER_PICK_UP_REASONS = [
    {
        value: 'user_wont_confirm_delivery',
        label: 'User refusing to confirm delivery',
        description: 'Item was delivered but user is withholding confirmation to delay escrow release',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['task_completed', 'completed'],
    },
    {
        value: 'user_claiming_non_delivery',
        label: 'User falsely claiming non-delivery',
        description: 'User claims item was not delivered despite runner having proof of delivery',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['task_completed', 'completed'],
    },
    {
        value: 'wrong_item_given_by_sender',
        label: 'Wrong item given by sender',
        description: 'The item at pickup did not match the order description',
        windowClosesAfter: [
            'en_route_to_delivery',
            'arrived_at_delivery_location',
            'delivered',
            'task_completed',
            'completed',
        ],
    },
    {
        value: 'dangerous_pickup_location',
        label: 'Unsafe or dangerous pickup location',
        description: 'The pickup location was unsafe, inaccessible, or posed a risk to the runner',
        windowClosesAfter: [
            'item_collected',
            'en_route_to_delivery',
            'arrived_at_delivery_location',
            'delivered',
            'task_completed',
            'completed',
        ],
    },
    {
        value: 'dangerous_delivery_location',
        label: 'Unsafe or dangerous delivery location',
        description: 'The delivery location was unsafe, inaccessible, or posed a risk to the runner',
        windowOpensAt: 'en_route_to_delivery',
        windowClosesAfter: ['delivered', 'task_completed', 'completed'],
    },
    {
        value: 'user_misconduct',
        label: 'User misconduct',
        description: 'User was abusive, threatening, or acted in bad faith during the order',
        windowClosesAfter: [],
    },
    {
        value: 'other',
        label: 'Other',
        description: 'Something else not listed above',
        windowClosesAfter: [],
    },
];

// ─── RUNNER reasons for run-errand orders ────────────────────────────────────
const RUNNER_RUN_ERRAND_REASONS = [
    {
        value: 'user_wont_confirm_delivery',
        label: 'User refusing to confirm delivery',
        description: 'Item was delivered but user is withholding confirmation to delay escrow release',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['task_completed', 'completed'],
    },
    {
        value: 'user_claiming_non_delivery',
        label: 'User falsely claiming non-delivery',
        description: 'User claims item was not delivered despite runner having proof',
        windowOpensAt: 'delivered',
        windowClosesAfter: ['task_completed', 'completed'],
    },
    {
        value: 'user_misconduct',
        label: 'User misconduct',
        description: 'User was abusive, threatening, or acted in bad faith during the order',
        windowClosesAfter: [],
    },
    {
        value: 'other',
        label: 'Other',
        description: 'Something else not listed above',
        windowClosesAfter: [],
    },
];

// ─── Exports ─────────────────────────────────────────────────────────────────
const DISPUTE_REASONS = {
    'run-errand': RUN_ERRAND_REASONS,
    'pick-up': PICK_UP_REASONS,
};

const RUNNER_DISPUTE_REASONS = {
    'run-errand': RUNNER_RUN_ERRAND_REASONS,
    'pick-up': RUNNER_PICK_UP_REASONS,
};

// Status order for windowOpensAt comparison
const STATUS_ORDER = [
    'pending_payment',
    'accepted',
    'arrived_at_pickup_location',
    'item_collected',
    'en_route_to_delivery',
    'arrived_at_delivery_location',
    'arrived_at_market',
    'purchase_in_progress',
    'purchase_completed',
    'delivered',
    'task_completed',
    'completed',
];

function normaliseServiceType(serviceType = '') {
    const s = serviceType.toLowerCase();
    if (s.includes('errand')) return 'run-errand';
    if (s.includes('pick')) return 'pick-up';
    return null;
}

/**
 * Returns true if a user-side reason is still valid for the given status
 */
function isReasonValid(serviceType, orderStatus, reason) {
    const type = normaliseServiceType(serviceType);
    if (!type) return false;

    const match = (DISPUTE_REASONS[type] ?? []).find(r => r.value === reason);
    if (!match) return false;

    // Check windowClosesAfter
    if (match.windowClosesAfter.includes(orderStatus)) return false;

    // Check windowOpensAt
    if (match.windowOpensAt) {
        const currentIdx = STATUS_ORDER.indexOf(orderStatus);
        const opensIdx = STATUS_ORDER.indexOf(match.windowOpensAt);
        if (currentIdx < opensIdx) return false;
    }

    return true;
}

/**
 * Returns true if a runner-side reason is still valid for the given status
 */
function isRunnerReasonValid(serviceType, orderStatus, reason) {
    const type = normaliseServiceType(serviceType);
    if (!type) return false;

    const match = (RUNNER_DISPUTE_REASONS[type] ?? []).find(r => r.value === reason);
    if (!match) return false;

    // Check windowClosesAfter
    if (match.windowClosesAfter.includes(orderStatus)) return false;

    // Check windowOpensAt
    if (match.windowOpensAt) {
        const currentIdx = STATUS_ORDER.indexOf(orderStatus);
        const opensIdx = STATUS_ORDER.indexOf(match.windowOpensAt);
        if (currentIdx < opensIdx) return false;
    }

    return true;
}

/**
 * Returns the human-readable label for a saved reason value
 */
function getReasonLabel(reasonValue) {
    const all = [
        ...RUN_ERRAND_REASONS,
        ...PICK_UP_REASONS,
        ...RUNNER_PICK_UP_REASONS,
        ...RUNNER_RUN_ERRAND_REASONS,
    ];
    const match = all.find(r => r.value === reasonValue);
    return match?.label ?? reasonValue;
}

/**
 * Check if a reason is item-level (blocked by usedPayoutSystem)
 */
const ITEM_LEVEL_REASONS = new Set([
    'item_not_delivered',
    'item_damaged_in_transit',
    'item_not_collected',
    'wrong_item_collected',
]);

function isItemLevelReason(reason) {
    return ITEM_LEVEL_REASONS.has(reason);
}

module.exports = {
    DISPUTE_REASONS,
    RUNNER_DISPUTE_REASONS,
    normaliseServiceType,
    isReasonValid,
    isRunnerReasonValid,
    getReasonLabel,
    isItemLevelReason,
    STATUS_ORDER,
};