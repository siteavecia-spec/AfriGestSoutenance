const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true, required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },

    targetEntityType: { type: String, enum: ['product'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId }, // if update existing

    // For product proposals: either full payload (create) or partial changes (update)
    proposedChanges: { type: Object, required: true },

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reason: { type: String }, // rejection reason or reviewer note

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

proposalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Proposal', proposalSchema);
