const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema({
  // Informations personnelles
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  phone: {
    type: String,
    required: [true, 'Le téléphone est requis'],
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Numéro de téléphone invalide']
  },

  // Informations entreprise
  company: {
    type: String,
    required: [true, 'Le nom de l\'entreprise est requis'],
    trim: true,
    maxlength: [100, 'Le nom de l\'entreprise ne peut pas dépasser 100 caractères']
  },
  businessType: {
    type: String,
    required: [true, 'Le type d\'activité est requis'],
    enum: [
      'Commerce de détail',
      'Restaurant/Café',
      'Boutique de mode',
      'Électronique/Informatique',
      'Pharmacie',
      'Superette',
      'Boutique de beauté',
      'Autre'
    ]
  },
  storeCount: {
    type: String,
    required: [true, 'Le nombre de boutiques est requis'],
    enum: [
      '1 boutique',
      '2-3 boutiques',
      '4-5 boutiques',
      '6-10 boutiques',
      'Plus de 10 boutiques'
    ]
  },

  // Message optionnel
  message: {
    type: String,
    trim: true,
    maxlength: [1000, 'Le message ne peut pas dépasser 1000 caractères']
  },

  // Statut de la demande
  status: {
    type: String,
    enum: ['new', 'contacted', 'demo_scheduled', 'demo_completed', 'converted', 'rejected'],
    default: 'new'
  },

  // Date de résolution (remplie lorsque la demande est terminée ou convertie)
  resolutionDate: {
    type: Date,
  },

  // Informations de suivi
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Métadonnées
  source: {
    type: String,
    default: 'landing_page'
  },
  ipAddress: String,
  userAgent: String,
  referrer: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les requêtes
demoRequestSchema.index({ email: 1 });
demoRequestSchema.index({ status: 1 });
demoRequestSchema.index({ createdAt: -1 });
demoRequestSchema.index({ priority: 1 });
demoRequestSchema.index({ resolutionDate: -1 });

// Virtual pour le nom complet
demoRequestSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual pour vérifier si la demande est récente
demoRequestSchema.virtual('isRecent').get(function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > oneDayAgo;
});

// Virtual pour indiquer si la demande est résolue
demoRequestSchema.virtual('isResolved').get(function() {
  return ['demo_completed', 'converted', 'rejected'].includes(this.status);
});

// Méthode pour marquer comme contacté
demoRequestSchema.methods.markAsContacted = function(userId) {
  this.status = 'contacted';
  this.assignedTo = userId;
  this.notes.push({
    note: 'Demande contactée par l\'équipe commerciale',
    addedBy: userId
  });
  return this.save();
};

// Méthode pour programmer une démo
demoRequestSchema.methods.scheduleDemo = function(userId, demoDate, notes = '') {
  this.status = 'demo_scheduled';
  this.assignedTo = userId;
  this.notes.push({
    note: `Démo programmée pour le ${demoDate}. ${notes}`,
    addedBy: userId
  });
  return this.save();
};

// Méthode pour ajouter une note
demoRequestSchema.methods.addNote = function(note, userId) {
  this.notes.push({
    note,
    addedBy: userId
  });
  return this.save();
};

// Méthodes statiques
demoRequestSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

demoRequestSchema.statics.findRecent = function(days = 7) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({ createdAt: { $gte: date } }).sort({ createdAt: -1 });
};

demoRequestSchema.statics.getStatistics = async function() {
  const total = await this.countDocuments();
  const newRequests = await this.countDocuments({ status: 'new' });
  const contacted = await this.countDocuments({ status: 'contacted' });
  const demoScheduled = await this.countDocuments({ status: 'demo_scheduled' });
  const demoCompleted = await this.countDocuments({ status: 'demo_completed' });
  const converted = await this.countDocuments({ status: 'converted' });
  
  return {
    total,
    newRequests,
    contacted,
    demoScheduled,
    demoCompleted,
    converted,
    conversionRate: total > 0 ? (converted / total * 100).toFixed(2) : 0
  };
};

demoRequestSchema.statics.findByBusinessType = function(businessType) {
  return this.find({ businessType }).sort({ createdAt: -1 });
};

demoRequestSchema.statics.findByStoreCount = function(storeCount) {
  return this.find({ storeCount }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('DemoRequest', demoRequestSchema);
