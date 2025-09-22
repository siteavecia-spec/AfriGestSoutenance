const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['success', 'info', 'warning', 'error'], default: 'info' },
    read: { type: Boolean, default: false },
    meta: { type: Object },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
