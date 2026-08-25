const ROLE = ['user', 'runner', 'admin', 'super-admin']; // 'sales', 'manager', 
const GENDER = ['male', 'female'];
const FLEET = ['cycling', 'bike', 'car', 'van', 'pedestrian'];
const EDUCATION = ['graduate', 'undergraduate', 'high-school'];
SERVICE_TYPE = ['pick-up', 'run-errand'];

BUSINESS_STATUS = ['active', 'suspended', 'banned']

const RUNNER_STATUS = [
  'pending_verification',
  'approved_limited',
  'approved_full',
  'suspended',
  'rejected',
  'banned',
]

const VERIFICATION_STATUS = [
  'not_submitted',
  'pending_review',
  'approved',
  'rejected'
];

const TASK_TYPES = {
  RUN_ERRAND: 'run-errand',
  PICK_UP: 'pick-up'
};

const STATUS_FLOWS = {
  [TASK_TYPES.RUN_ERRAND]: [
    'arrived_at_market',
    'purchase_in_progress',
    'purchase_completed',
    'en_route_to_delivery',
    'item_delivered',
    'arrived_at_delivery_location',
    'task_completed'
  ],
  [TASK_TYPES.PICK_UP]: [
    'arrived_at_pickup_location',
    'item_collected',
    'en_route_to_delivery',
    'arrived_at_delivery_location',
    'item_delivered',
    'task_completed'
  ]
};

const ALL_STATUSES = [
  ...new Set([ // remove duplicates
    ...STATUS_FLOWS[TASK_TYPES.RUN_ERRAND],
    ...STATUS_FLOWS[TASK_TYPES.PICK_UP]
  ])
];

const STATUS_GROUPS = {
  payment_pending: ['pending_payment', 'payment_failed'],
  awaiting_runner: ['paid'],
  in_progress: ['accepted', 'shopping', 'items_submitted', 'items_approved',
    'purchase_in_progress', 'purchase_completed', 'en_route_to_pickup',
    'arrived_at_pickup', 'picked_up', 'en_route_to_delivery',
    'arrived_at_delivery', 'delivered', 'active', 'item_delivered', 'in_progress'],
  completed: ['completed'],
  cancelled: ['cancelled'],
  disputed: ['disputed'],
};

const CANCELLABLE_STATES_BY_SERVICE = {
  [TASK_TYPES.PICK_UP]: new Set([
    'pending_payment', 'paid', 'accepted',
    'en_route_to_pickup', 'arrived_at_pickup', 'picked_up',
    // NOT en_route_to_delivery — runner has left pickup location
  ]),
  [TASK_TYPES.RUN_ERRAND]: new Set([
    'pending_payment', 'paid', 'accepted', 'shopping',
    'items_submitted', 'items_approved', 'purchase_in_progress',
    // NOT purchase_completed — vendor paid
  ]),
};

const DISPUTE_WINDOW_HOURS = parseInt(process.env.DISPUTE_WINDOW_HOURS || '72', 10);

const ACTIVITIES = ['login',
  'logout',
  'register',
  'profile_update',
  'password_change',
  'email_change',
  'phone_verification',
  'email_verification',
  'password_reset_request',
  'password_reset_success',
  'social_login',
  'account_deactivated',
  'account_reactivated',
  'preferences_updated',
  'avatar_updated',
  'two_factor_enabled',
  'two_factor_disabled',
  'api_key_created',
  'api_key_revoked'
];

const SEVERITY = ['low', 'medium', 'high', 'critical'];
const STATUS = ['success', 'failed', 'pending']

module.exports = {
  ROLE,
  GENDER,
  FLEET,
  EDUCATION,
  RUNNER_STATUS,
  ACTIVITIES,
  SEVERITY,
  STATUS,
  SERVICE_TYPE,
  VERIFICATION_STATUS,
  ALL_STATUSES,
  TASK_TYPES,
  STATUS_FLOWS,
  BUSINESS_STATUS,
  STATUS_GROUPS,
  CANCELLABLE_STATES_BY_SERVICE,
  DISPUTE_WINDOW_HOURS
}