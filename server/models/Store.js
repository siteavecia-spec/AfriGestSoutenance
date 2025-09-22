const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  // Informations de base
  name: {
    type: String,
    required: [true, 'Le nom de la boutique est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  code: {
    type: String,
    required: [true, 'Le code de la boutique est requis'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Le code ne peut pas dépasser 20 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  
  // Relation avec l'entreprise
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'L\'ID de l\'entreprise est requis']
  },
  
  // Informations de contact
  email: {
    type: String,
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
    postalCode: { type: String, trim: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  
  // Type et configuration
  type: {
    type: String,
    enum: ['physical', 'virtual', 'hybrid'],
    default: 'physical'
  },
  
  settings: {
    // Horaires d'ouverture
    workingHours: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
    },
    
    // Configuration de la caisse
    cashRegister: {
      startingAmount: { type: Number, default: 0 },
      currentAmount: { type: Number, default: 0 },
      lastReset: { type: Date }
    },
    
    // Paramètres de vente
    sales: {
      allowDiscount: { type: Boolean, default: true },
      maxDiscountPercent: { type: Number, default: 50, min: 0, max: 100 },
      requireCustomerInfo: { type: Boolean, default: false },
      printReceipt: { type: Boolean, default: true }
    },
    
    // Configuration des stocks
    inventory: {
      lowStockThreshold: { type: Number, default: 10 },
      allowNegativeStock: { type: Boolean, default: false },
      autoReorder: { type: Boolean, default: false }
    }
  },
  
  // Statut
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Gestionnaire de la boutique
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Statistiques
  stats: {
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    averageSaleAmount: { type: Number, default: 0 },
    lastSaleDate: { type: Date },
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
storeSchema.index({ companyId: 1, code: 1 }, { unique: true });
storeSchema.index({ companyId: 1, isActive: 1 });
storeSchema.index({ managerId: 1 });
storeSchema.index({ status: 1 });

// Virtual pour l'adresse complète
storeSchema.virtual('fullAddress').get(function() {
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

// Virtual pour le nom complet avec code
storeSchema.virtual('fullName').get(function() {
  return `${this.name} (${this.code})`;
});

// Virtual pour vérifier si la boutique est ouverte
storeSchema.virtual('isOpen').get(function() {
  try {
    const now = new Date();
    // Extraire le nom du jour de manière sûre
    const weekday = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const dayKey = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(weekday)
      ? weekday
      : 'monday';

    const daySchedule = this.settings?.workingHours?.[dayKey];
    if (!daySchedule || !daySchedule.isOpen) return false;

    const currentTime = now.getHours() * 100 + now.getMinutes();
    const openTime = parseInt(String(daySchedule.open || '00:00').replace(':', ''));
    const closeTime = parseInt(String(daySchedule.close || '23:59').replace(':', ''));

    return currentTime >= openTime && currentTime <= closeTime;
  } catch (e) {
    return false;
  }
});

// Middleware pre-save pour générer le code si non fourni
storeSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const Company = mongoose.model('Company');
    const company = await Company.findById(this.companyId);
    
    if (company) {
      const storeCount = await mongoose.model('Store').countDocuments({ 
        companyId: this.companyId 
      });
      this.code = `${company.name.substring(0, 3).toUpperCase()} ${storeCount + 1}.0`;
    }
  }
  
  // Mettre à jour la dernière activité
  this.stats.lastActivity = new Date();
  next();
});

// Méthode pour mettre à jour les statistiques
storeSchema.methods.updateStats = async function() {
  const Sale = mongoose.model('Sale');
  const Product = mongoose.model('Product');
  
  try {
    const [salesCount, revenue, productCount] = await Promise.all([
      Sale.countDocuments({ storeId: this._id }),
      Sale.aggregate([
        { $match: { storeId: this._id } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Product.countDocuments({ storeId: this._id, isActive: true })
    ]);
    
    this.stats.totalSales = salesCount;
    this.stats.totalRevenue = revenue[0]?.total || 0;
    this.stats.totalProducts = productCount;
    this.stats.lastActivity = new Date();
    
    // Calculer le montant moyen des ventes
    if (salesCount > 0) {
      this.stats.averageSaleAmount = this.stats.totalRevenue / salesCount;
    }
    
    await this.save();
  } catch (error) {
    console.error('Error updating store stats:', error);
  }
};

// Méthode pour vérifier les horaires d'ouverture
storeSchema.methods.getWorkingHours = function(day) {
  return this.settings.workingHours[day] || { isOpen: false };
};

// Méthode pour réinitialiser la caisse
storeSchema.methods.resetCashRegister = function(amount = 0) {
  this.settings.cashRegister.startingAmount = amount;
  this.settings.cashRegister.currentAmount = amount;
  this.settings.cashRegister.lastReset = new Date();
  return this.save();
};

module.exports = mongoose.model('Store', storeSchema);
