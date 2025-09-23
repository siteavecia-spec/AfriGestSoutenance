const mongoose = require('mongoose');

const referralCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

referralCodeSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('ReferralCode', referralCodeSchema);
