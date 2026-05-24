/**
 * auditOrder.js
 * Run: node scripts/auditOrder.js ORD-MPK7OG2O-4BT2N
 *
 * Audits a single order across Order, Escrow, LedgerEntry, RunnerPayout,
 * Wallet (user + runner) and prints every inconsistency it finds.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const ORDER_ID = process.argv[2];
if (!ORDER_ID) {
  console.error('Usage: node scripts/auditOrder.js <orderId>');
  process.exit(1);
}

// ── Inline schema refs (lean — no business logic needed) ──────────────────────
const Order        = require('../models/Order');
const Escrow       = require('../models/Escrows');
const LedgerEntry  = require('../models/LedgerEntry');
const RunnerPayout = require('../models/RunnerPayout');
const Wallet       = require('../models/Wallet');

const SEPARATOR = '─'.repeat(70);
const ok  = (msg) => console.log(`  ✅  ${msg}`);
const warn = (msg) => console.log(`  ⚠️   ${msg}`);
const fail = (msg) => console.log(`  ❌  ${msg}`);
const info = (msg) => console.log(`  ℹ️   ${msg}`);

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log(`\n${SEPARATOR}`);
  console.log(`  AUDIT: ${ORDER_ID}`);
  console.log(SEPARATOR);

  // ── 1. Order ────────────────────────────────────────────────────────────────
  console.log('\n[1] ORDER');
  const order = await Order.findOne({ orderId: ORDER_ID }).sort({ createdAt: -1 }).lean();
  if (!order) {
    fail(`No Order document found for orderId="${ORDER_ID}"`);
    process.exit(1);
  }

  info(`_id:          ${order._id}`);
  info(`orderId:      ${order.orderId}`);
  info(`chatId:       ${order.chatId}`);
  info(`serviceType:  ${order.serviceType}`);
  info(`status:       ${order.status}`);
  info(`paymentStatus:${order.paymentStatus}`);
  info(`totalAmount:  ${order.totalAmount}`);
  info(`deliveryFee:  ${order.deliveryFee}`);
  info(`itemBudget:   ${order.itemBudget}`);
  info(`escrowId:     ${order.escrowId}`);
  info(`usedPayoutSystem: ${order.usedPayoutSystem}`);
  info(`userId:       ${order.userId}`);
  info(`runnerId:     ${order.runnerId}`);

  const expectedTotal = (order.itemBudget || 0) + order.deliveryFee;
  if (Math.abs(expectedTotal - order.totalAmount) > 1) {
    fail(`Pricing integrity: itemBudget(${order.itemBudget}) + deliveryFee(${order.deliveryFee}) = ${expectedTotal} ≠ totalAmount(${order.totalAmount})`);
  } else {
    ok('Pricing integrity OK');
  }

  // ── 2. Escrow ───────────────────────────────────────────────────────────────
  console.log('\n[2] ESCROW');

  // Try every possible way the escrow could have been linked
  const escrowCandidates = await Escrow.find({
    $or: [
      { taskId: ORDER_ID },
      { _id: order.escrowId || null },
      { orderId: order._id },
    ]
  }).lean();

  if (escrowCandidates.length === 0) {
    fail('No Escrow document found (tried taskId, _id via order.escrowId, orderId via order._id)');
  } else {
    if (escrowCandidates.length > 1) {
      warn(`Found ${escrowCandidates.length} escrow candidates — possible duplicate!`);
    }
    const escrow = escrowCandidates[0];
    info(`_id:              ${escrow._id}`);
    info(`taskId:           ${escrow.taskId}  ← should equal orderId string`);
    info(`orderId field:    ${escrow.orderId}  ← should equal order._id`);
    info(`status:           ${escrow.status}`);
    info(`totalAmount:      ${escrow.totalAmount}`);
    info(`runnerPayout:     ${escrow.runnerPayout}`);
    info(`platformFee:      ${escrow.platformFee}`);
    info(`providerFee:      ${escrow.providerFee}`);
    info(`netPlatformFee:   ${escrow.netPlatformFee}`);
    info(`deliveryFeeReleased: ${escrow.deliveryFeeReleased}`);
    info(`itemBudgetReleased:  ${escrow.itemBudgetReleased}`);

    if (escrow.taskId !== ORDER_ID) {
      fail(`taskId mismatch: escrow.taskId="${escrow.taskId}" ≠ orderId="${ORDER_ID}"`);
    } else {
      ok('escrow.taskId matches orderId');
    }

    if (String(escrow.orderId) !== String(order._id)) {
      warn(`escrow.orderId (${escrow.orderId}) ≠ order._id (${order._id}) — $or query may resolve via wrong branch`);
    } else {
      ok('escrow.orderId matches order._id');
    }

    if (escrow.totalAmount !== order.totalAmount) {
      fail(`Amount mismatch: escrow.totalAmount=${escrow.totalAmount} ≠ order.totalAmount=${order.totalAmount}`);
    } else {
      ok('escrow.totalAmount matches order.totalAmount');
    }

    if (!escrow.providerFee && !escrow.netPlatformFee) {
      warn('providerFee and netPlatformFee are both 0/null on escrow — fee split may be recalculated incorrectly in payoutToRunner');
    }
  }

  // ── 3. LedgerEntry ─────────────────────────────────────────────────────────
  console.log('\n[3] LEDGER ENTRIES');

  const ledgerEntries = await LedgerEntry.find({ orderId: ORDER_ID }).sort({ createdAt: 1 }).lean();

  if (ledgerEntries.length === 0) {
    fail(`No LedgerEntry documents found for orderId="${ORDER_ID}"`);
    warn('Possible causes:');
    warn('  a) payoutToRunner threw inside withTransaction and the error was swallowed upstream');
    warn('  b) orderId was stored as ObjectId or wrong string (check escrow.taskId above)');
    warn('  c) The LedgerEntry pre-save integrity check threw and aborted the transaction');
  } else {
    info(`Found ${ledgerEntries.length} entries:`);
    const types = [];
    for (const e of ledgerEntries) {
      info(`  [${e.type}] gross=${e.grossAmount} net=${e.netAmount} userModel=${e.userModel} status=${e.status} userId=${e.userId}`);
      types.push(e.type);
    }

    const hasRunnerCredit = ledgerEntries.some(e => e.type === 'escrow_release' && e.userModel === 'Runner');
    if (!hasRunnerCredit) {
      fail('No escrow_release entry for Runner — runner was credited in wallet but ledger write failed or was skipped');
    } else {
      ok('Runner escrow_release ledger entry exists');
    }

    const hasEscrowLock = ledgerEntries.some(e => e.type === 'escrow_lock');
    if (!hasEscrowLock) {
      warn('No escrow_lock entry — payment ledger entry may be missing');
    } else {
      ok('escrow_lock entry exists');
    }
  }

  // ── 4. RunnerPayout ─────────────────────────────────────────────────────────
  console.log('\n[4] RUNNER PAYOUT');
  const payout = await RunnerPayout.findOne({ orderId: ORDER_ID }).lean();
  if (!payout) {
    info('No RunnerPayout document (expected for pick-up orders)');
  } else {
    info(`status:           ${payout.status}`);
    info(`usedPayoutSystem: ${payout.usedPayoutSystem}`);
    info(`itemBudget:       ${payout.itemBudget}`);
    info(`amountSpent:      ${payout.amountSpent}`);
    info(`runnerId:         ${payout.runnerId}`);
  }

  // ── 5. Wallets ──────────────────────────────────────────────────────────────
  console.log('\n[5] WALLETS');

  const userWallet = await Wallet.findOne({ userId: order.userId }).lean();
  if (!userWallet) {
    fail(`No Wallet found for userId=${order.userId}`);
  } else {
    info(`User wallet balance:       ${userWallet._balance}`);
    info(`User wallet lockedBalance: ${userWallet.lockedBalance}`);
  }

  const runnerWallet = await Wallet.findOne({ userId: order.runnerId }).lean();
  if (!runnerWallet) {
    fail(`No Wallet found for runnerId=${order.runnerId}`);
  } else {
    info(`Runner wallet balance:       ${runnerWallet._balance}`);
    info(`Runner wallet lockedBalance: ${runnerWallet.lockedBalance}`);
  }

  // ── 6. Cross-check: runner wallet vs ledger ──────────────────────────────────
  console.log('\n[6] CROSS-CHECK');

  const runnerLedger = await LedgerEntry.find({
    userId: order.runnerId.toString(),
    userModel: 'Runner',
    type: 'escrow_release',
    orderId: ORDER_ID,
  }).lean();

  if (runnerLedger.length === 0) {
    fail('Runner has no escrow_release ledger entry for this order');
    if (runnerWallet) {
      warn(`Runner wallet balance is ${runnerWallet._balance} — if > 0, credit happened without ledger write`);
      warn('This means wallet.credit() succeeded but LedgerEntry.create() threw inside the transaction');
      warn('Check: did the transaction actually commit? wallet.credit() may have its own session handling');
    }
  } else {
    ok(`Runner ledger entry found: NGN ${runnerLedger[0].netAmount}`);
    if (runnerWallet && Math.abs(runnerWallet._balance - runnerLedger[0].netAmount) > 1) {
      // This is not exact — wallet may have other orders — just flag it
      info(`Runner balance (${runnerWallet._balance}) vs this order ledger amount (${runnerLedger[0].netAmount}) — may include other orders, OK`);
    }
  }

  // ── 7. Simulate payoutToRunner orderId resolution ────────────────────────────
  console.log('\n[7] PAYOUT ORDERID RESOLUTION SIMULATION');
  if (escrowCandidates.length > 0) {
    const escrow = escrowCandidates[0];
    const orderViaEscrowId   = await Order.findOne({ escrowId: escrow._id }).sort({ createdAt: -1 }).lean();
    const orderViaTaskId     = await Order.findOne({ orderId: escrow.taskId }).sort({ createdAt: -1 }).lean();
    const orderViaEscrowOId  = await Order.findOne({ orderId: escrow.orderId }).sort({ createdAt: -1 }).lean();

    info(`$or branch 1 (escrowId=${escrow._id}):   ${orderViaEscrowId ? orderViaEscrowId.orderId : 'NOT FOUND'}`);
    info(`$or branch 2 (orderId=taskId=${escrow.taskId}): ${orderViaTaskId ? orderViaTaskId.orderId : 'NOT FOUND'}`);
    info(`$or branch 3 (orderId=escrow.orderId=${escrow.orderId}): ${orderViaEscrowOId ? orderViaEscrowOId.orderId : 'NOT FOUND'}`);

    const resolvedOrder = orderViaEscrowId || orderViaTaskId || orderViaEscrowOId;
    const resolvedOrderId = resolvedOrder?.orderId ?? escrow.taskId;
    info(`resolvedOrderId that payoutToRunner would use: "${resolvedOrderId}"`);

    if (resolvedOrderId !== ORDER_ID) {
      fail(`resolvedOrderId "${resolvedOrderId}" ≠ input orderId "${ORDER_ID}" — this is why ledger entries are written under the wrong orderId!`);
    } else {
      ok(`resolvedOrderId correctly resolves to "${ORDER_ID}"`);
    }
  }

  console.log(`\n${SEPARATOR}\n`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Audit failed:', err);
  mongoose.disconnect();
  process.exit(1);
});