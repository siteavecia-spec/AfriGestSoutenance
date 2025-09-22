const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Informations de base
  name: {
    type: String,
    required: [true, 'Le nom de l\'entreprise est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  
  // Informations de contact
  email: {
    type: String,
    required: [true, 'L\'email de l\'entreprise est requis'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Numéro de téléphone invalide']
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Guinée' },
    postalCode: { type: String, trim: true }
  },
  
  // Informations légales
  legalInfo: {
    registrationNumber: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    legalForm: { 
      type: String, 
      enum: ['SARL', 'SA', 'SNC', 'EURL', 'Auto-entrepreneur', 'Autre'],
      default: 'SARL'
    }
  },
  
  // Configuration et personnalisation
  settings: {
    currency: { type: String, default: 'GNF' },
    timezone: { type: String, default: 'Africa/Conakry' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    language: { type: String, default: 'fr' },
    // Affichage public (consentement landing)
    isPublicOnLanding: { type: Boolean, default: false },
    
    // Personnalisation visuelle
    branding: {
      primaryColor: { type: String, default: '#1D4ED8' },
      secondaryColor: { type: String, default: '#059669' },
      logo: { type: String }, // URL du logo
      favicon: { type: String }, // URL du favicon
      websiteUrl: { type: String }, // URL du site vitrine (optionnel)
    },
    
    // Paramètres de fonctionnement
    business: {
      workingHours: {
        start: { type: String, default: '08:00' },
        end: { type: String, default: '18:00' }
      },
      workingDays: {
        type: [String],
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      taxRate: { type: Number, default: 0.18, min: 0, max: 1 }, // 18% par défaut
      allowNegativeStock: { type: Boolean, default: false }
    },

    // Paramètres e-commerce (feature flag + config)
    ecommerce: {
      enabled: { type: Boolean, default: false },
      subdomain: { type: String, trim: true },
      stockMode: { type: String, enum: ['shared', 'dedicated'], default: 'shared' },
      webhooks: {
        inventory: { type: String, trim: true },
      },
    }
  },
  
  // Statut et abonnement
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: { type: Date },
    endDate: { type: Date },
    maxStores: { type: Number, default: 1 },
    maxUsers: { type: Number, default: 5 }
  },
  
  // Statistiques
  stats: {
    totalStores: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastActivity: { type: Date }
  },
  
  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les requêtes
companySchema.index({ name: 1 });
companySchema.index({ email: 1 });
companySchema.index({ status: 1 });
companySchema.index({ 'subscription.plan': 1 });

// Virtual pour l'adresse complète
companySchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  if (!addr) return '';
  
  const parts = [
    addr.street,
    addr.city,
    addr.state,
    addr.postalCode,
    addr.country
  ].filter(Boolean);
  
  return parts.join(', ');
});

// Virtual pour vérifier si l'abonnement est actif
companySchema.virtual('isSubscriptionActive').get(function() {
  if (!this.subscription.endDate) return true;
  return new Date() <= this.subscription.endDate;
});

// Virtual pour vérifier les limites d'utilisation
companySchema.virtual('canAddStore').get(function() {
  return this.stats.totalStores < this.subscription.maxStores;
});

companySchema.virtual('canAddUser').get(function() {
  return this.stats.totalUsers < this.subscription.maxUsers;
});

// Virtual populate: list of stores for this company
companySchema.virtual('stores', {
  ref: 'Store',
  localField: '_id',
  foreignField: 'companyId',
  justOne: false,
});

// Middleware pre-save pour mettre à jour les statistiques
companySchema.pre('save', function(next) {
  // Mettre à jour la dernière activité
  this.stats.lastActivity = new Date();
  next();
});

// Méthode pour mettre à jour les statistiques
companySchema.methods.updateStats = async function() {
  const Store = mongoose.model('Store');
  const User = mongoose.model('User');
  
  try {
    const [storeCount, userCount] = await Promise.all([
      Store.countDocuments({ companyId: this._id, isActive: true }),
      User.countDocuments({ companyId: this._id, isActive: true })
    ]);
    
    this.stats.totalStores = storeCount;
    this.stats.totalUsers = userCount;
    this.stats.lastActivity = new Date();
    
    await this.save();
  } catch (error) {
    console.error('Error updating company stats:', error);
  }
};

// Méthode pour vérifier les permissions d'accès
companySchema.methods.hasAccess = function(userId, requiredRole = 'employee') {
  const roleHierarchy = {
    'super_admin': 0,
    'company_admin': 1,
    'store_manager': 2,
    'employee': 3
  };
  
  // Cette méthode sera complétée avec la logique d'autorisation
  return true; // Placeholder
};

// Méthode pour obtenir les données publiques (sans informations sensibles)
companySchema.methods.toPublicJSON = function() {
  const companyObject = this.toObject();
  delete companyObject.subscription;
  delete companyObject.stats;
  delete companyObject.createdBy;
  delete companyObject.updatedBy;
  return companyObject;
};

// Méthode pour obtenir le nombre de boutiques
companySchema.methods.getStoreCount = async function() {
  const Store = mongoose.model('Store');
  return await Store.countDocuments({ companyId: this._id, isActive: true });
};


// Méthode pour mettre à jour les statistiques
companySchema.methods.updateStats = async function() {
  const Store = mongoose.model('Store');
  const User = mongoose.model('User');
  
  const storeCount = await Store.countDocuments({ companyId: this._id, isActive: true });
  const userCount = await User.countDocuments({ company: this._id, isActive: true });
  
  this.stats.totalStores = storeCount;
  this.stats.totalUsers = userCount;
  this.stats.lastActivity = new Date();
  
  await this.save();
};

// Méthodes statiques
companySchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

companySchema.statics.findByName = function(name) {
  return this.find({ name: { $regex: name, $options: 'i' } });
};

companySchema.statics.getTotalCount = function() {
  return this.countDocuments();
};

companySchema.statics.getStatistics = async function() {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ status: 'active' });
  const suspended = await this.countDocuments({ status: 'suspended' });
  const inactive = await this.countDocuments({ status: 'inactive' });
  
  return { total, active, suspended, inactive };
};

companySchema.statics.findRecent = function(limit = 10) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

companySchema.statics.search = function(criteria) {
  const query = {};
  
  if (criteria.name) {
    query.name = { $regex: criteria.name, $options: 'i' };
  }
  if (criteria.description) {
    query.description = { $regex: criteria.description, $options: 'i' };
  }
  if (criteria.status) {
    query.status = criteria.status;
  }
  
  return this.find(query);
};

companySchema.statics.findByLocation = function(location) {
  return this.find({
    $or: [
      { 'address.city': { $regex: location, $options: 'i' } },
      { 'address.state': { $regex: location, $options: 'i' } },
      { 'address.country': { $regex: location, $options: 'i' } }
    ]
  });
};

module.exports = mongoose.model('Company', companySchema);
