const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  phone: {
    type: String,
    required: [true, 'Le téléphone est requis'],
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'Guinée' },
    postalCode: { type: String }
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  customerType: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String
  },
  stats: {
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastPurchase: { type: Date }
  }
}, {
  timestamps: true
});

customerSchema.index({ companyId: 1, phone: 1 });
customerSchema.index({ companyId: 1, email: 1 });

customerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Customer', customerSchema);
