const mongoose = require('mongoose');

const referralRewardSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rewardType: { type: String, required: true }, // e.g. 'credit_service', 'free_month'
    rewardValue: { type: Number },
    status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending', index: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralReward', referralRewardSchema);
