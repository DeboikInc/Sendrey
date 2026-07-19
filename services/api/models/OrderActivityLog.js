const mongoose = require('mongoose');

const orderActivityLogSchema = new mongoose.Schema({
  orderId: { type: String, index: true },
  actorType: { type: String, enum: ['user', 'runner', 'system', 'admin'] },
  actorId: { type: String, default: null },
  action: { type: String, required: true }, 
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

orderActivityLogSchema.index({ orderId: 1, createdAt: -1 });
const OrderActivityLog = mongoose.models.OrderActivityLog || mongoose.model('OrderActivityLog', orderActivityLogSchema);
module.exports = OrderActivityLog;