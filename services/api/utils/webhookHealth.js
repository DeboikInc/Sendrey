const state = {
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailureReason: null,
  consecutiveFailures: 0,
};

function recordSuccess() {
  state.lastSuccessAt = new Date();
  state.consecutiveFailures = 0;
}

function recordFailure(reason) {
  state.lastFailureAt = new Date();
  state.lastFailureReason = reason;
  state.consecutiveFailures += 1;
}

function getStatus() {
  return { ...state };
}

module.exports = { recordSuccess, recordFailure, getStatus };