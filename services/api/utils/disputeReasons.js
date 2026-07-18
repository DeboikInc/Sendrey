// utils/disputeReasons.js (SERVER)
// utils/disputeReasons.js
const RUN_ERRAND_REASONS = [
  { value: 'wrong_item', label: 'Wrong item', description: 'Runner purchased the wrong item', windowClosesAfter: [] },
  { value: 'missing_item', label: 'Missing item', description: 'One or more items were not delivered', windowClosesAfter: [] },
  { value: 'damaged_item', label: 'Damaged item', description: 'Item arrived damaged', windowClosesAfter: [] },
  { value: 'delivery_issue', label: 'Delivery issue', description: 'Problem with how the order was delivered', windowClosesAfter: [] },
  { value: 'incorrect_charge', label: 'Incorrect charge', description: 'Amount charged does not match the order', windowClosesAfter: [] },
  { value: 'runner_misconduct', label: 'Runner conduct', description: 'Unprofessional, threatening, or abusive behaviour', windowClosesAfter: [] },
  { value: 'runner_unresponsive', label: 'Runner went offline / unresponsive', description: 'Runner stopped communicating mid-order', windowClosesAfter: [] },
  { value: 'other', label: 'Other', description: 'Something else not listed above', windowClosesAfter: [] },
];

const PICK_UP_REASONS = [
  { value: 'damaged_item', label: 'Damaged item', description: 'Item arrived damaged', windowClosesAfter: [] },
  { value: 'delivery_issue', label: 'Delivery issue', description: 'Problem with how the order was delivered', windowClosesAfter: [] },
  { value: 'runner_misconduct', label: 'Runner conduct', description: 'Unprofessional, threatening, or abusive behaviour', windowClosesAfter: [] },
  { value: 'runner_unresponsive', label: 'Runner went offline / unresponsive', description: 'Runner stopped communicating mid-order', windowClosesAfter: [] },
  { value: 'other', label: 'Other', description: 'Something else not listed above', windowClosesAfter: [] },
];

const RUNNER_PICK_UP_REASONS = [
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

const RUNNER_RUN_ERRAND_REASONS = [
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

const DISPUTE_REASONS = {
  'run-errand': RUN_ERRAND_REASONS,
  'pick-up': PICK_UP_REASONS,
};

const RUNNER_DISPUTE_REASONS = {
  'run-errand': RUNNER_RUN_ERRAND_REASONS,
  'pick-up': RUNNER_PICK_UP_REASONS,
};

function normaliseServiceType(serviceType = '') {
  const s = (serviceType ?? '').toLowerCase();
  if (s.includes('errand')) return 'run-errand';
  if (s.includes('pick')) return 'pick-up';
  return null;
}

function getAvailableReasons(serviceType) {
  const type = normaliseServiceType(serviceType);
  if (!type) return [];
  return DISPUTE_REASONS[type] ?? [];
}

function getAvailableRunnerReasons(serviceType) {
  const type = normaliseServiceType(serviceType);
  if (!type) return [];
  return RUNNER_DISPUTE_REASONS[type] ?? [];
}

function isReasonValid(serviceType, reason) {
  const type = normaliseServiceType(serviceType);
  if (!type) return false;
  return (DISPUTE_REASONS[type] ?? []).some(r => r.value === reason);
}

function isRunnerReasonValid(serviceType, reason) {
  const type = normaliseServiceType(serviceType);
  if (!type) return false;
  return (RUNNER_DISPUTE_REASONS[type] ?? []).some(r => r.value === reason);
}

function getReasonLabel(reasonValue) {
  const all = [
    ...RUN_ERRAND_REASONS,
    ...PICK_UP_REASONS,
    ...RUNNER_PICK_UP_REASONS,
    ...RUNNER_RUN_ERRAND_REASONS,
  ];
  return all.find(r => r.value === reasonValue)?.label ?? reasonValue;
}

function isItemLevelReason(reason) {
  return ['wrong_item', 'missing_item'].includes(reason);
}

module.exports = {
  DISPUTE_REASONS,
  RUNNER_DISPUTE_REASONS,
  normaliseServiceType,
  getAvailableReasons,
  getAvailableRunnerReasons,
  isReasonValid,
  isRunnerReasonValid,
  getReasonLabel,
  isItemLevelReason,
};