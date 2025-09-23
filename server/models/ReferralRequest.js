const mongoose = require('mongoose');

const referralRequestSchema = new mongoose.Schema(
  {
    referralCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReferralCode',
      index: true,
    },
    prospectEmail: { type: String, required: true, trim: true, lowercase: true },
    prospectPhone: { type: String, trim: true },
    companyName: { type: String, trim: true },
    demoRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DemoRequest' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

referralRequestSchema.index({ prospectEmail: 1 });

module.exports = mongoose.model('ReferralRequest', referralRequestSchema);
