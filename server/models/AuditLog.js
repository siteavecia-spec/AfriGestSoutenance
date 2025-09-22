const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    entityType: { type: String, required: true }, // e.g. 'product', 'proposal'
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true }, // e.g. 'create', 'update', 'proposal_submitted', 'proposal_approved'
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changes: { type: Object }, // optional diff or payload snapshot
    meta: { type: Object },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

auditLogSchema.statics.record = function (doc) {
  return this.create(doc);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
