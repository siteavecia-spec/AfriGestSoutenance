const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Informations de base
  name: {
    type: String,
    required: [true, 'Le nom du produit est requis'],
    trim: true,
    maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
  },
  sku: {
    type: String,
    required: [true, 'Le SKU est requis'],
    trim: true,
    uppercase: true,
    maxlength: [50, 'Le SKU ne peut pas dépasser 50 caractères']
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Permet plusieurs valeurs null
  },
  
  // Relations
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'L\'ID de l\'entreprise est requis']
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'L\'ID de la boutique est requis']
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  
  // Prix et coûts
  pricing: {
    costPrice: {
      type: Number,
      required: [true, 'Le prix de revient est requis'],
      min: [0, 'Le prix de revient ne peut pas être négatif']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Le prix de vente est requis'],
      min: [0, 'Le prix de vente ne peut pas être négatif'],
      validate: {
        validator: function(v) {
          // 'this' points to the document; ensure selling >= cost
          const cost = (this.pricing && typeof this.pricing.costPrice === 'number') ? this.pricing.costPrice : 0;
          return typeof v === 'number' && v >= cost;
        },
        message: 'Le prix de vente doit être supérieur ou égal au prix de revient'
      }
    },
    wholesalePrice: {
      type: Number,
      min: [0, 'Le prix de gros ne peut pas être négatif']
    },
    margin: {
      type: Number,
      min: [0, 'La marge ne peut pas être négative']
    }
  },
  
  // Gestion des stocks
  inventory: {
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Le stock ne peut pas être négatif']
    },
    minStock: {
      type: Number,
      default: 0,
      min: [0, 'Le stock minimum ne peut pas être négatif']
    },
    maxStock: {
      type: Number,
      min: [0, 'Le stock maximum ne peut pas être négatif']
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: [0, 'Le point de réapprovisionnement ne peut pas être négatif']
    },
    unit: {
      type: String,
      enum: ['piece', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'box', 'pack'],
      default: 'piece'
    }
  },
  
  // Images et médias
  images: [{
    url: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false }
  }],
  
  // Statut et visibilité
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },

  // E-commerce (publication publique, optionnel et non bloquant)
  ecommerce: {
    isListed: { type: Boolean, default: false }, // visible sur la boutique en ligne
    title: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
  },
  
  // Propriétés du produit
  properties: {
    weight: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 }
    },
    color: { type: String },
    size: { type: String },
    brand: { type: String },
    model: { type: String }
  },
  
  // Taxes
  tax: {
    rate: { type: Number, default: 0.18, min: 0, max: 1 }, // 18% par défaut
    isInclusive: { type: Boolean, default: true } // Taxe incluse dans le prix
  },
  
  // Statistiques
  stats: {
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    lastSold: { type: Date }
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
productSchema.index({ companyId: 1, sku: 1 }, { unique: true });
productSchema.index({ storeId: 1, isActive: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ categoryId: 1 });

// Virtual pour la marge calculée
productSchema.virtual('calculatedMargin').get(function() {
  if (this.pricing.costPrice > 0) {
    return ((this.pricing.sellingPrice - this.pricing.costPrice) / this.pricing.costPrice) * 100;
  }
  return 0;
});

// Virtual pour le prix avec taxe
productSchema.virtual('priceWithTax').get(function() {
  if (this.tax.isInclusive) {
    return this.pricing.sellingPrice;
  }
  return this.pricing.sellingPrice * (1 + this.tax.rate);
});

// Virtual pour vérifier si le stock est faible
productSchema.virtual('isLowStock').get(function() {
  return this.inventory.currentStock <= this.inventory.minStock;
});

// Virtual pour vérifier si le stock est épuisé
productSchema.virtual('isOutOfStock').get(function() {
  return this.inventory.currentStock <= 0;
});

// Virtual pour l'image principale
productSchema.virtual('primaryImage').get(function() {
  if (!Array.isArray(this.images) || this.images.length === 0) {
    return null;
  }
  const primary = this.images.find(img => img && img.isPrimary);
  return primary || this.images[0] || null;
});

// Middleware pre-save pour calculer la marge
productSchema.pre('save', function(next) {
  if (this.pricing.costPrice > 0) {
    this.pricing.margin = ((this.pricing.sellingPrice - this.pricing.costPrice) / this.pricing.costPrice) * 100;
  }
  next();
});

// Méthode pour mettre à jour le stock
productSchema.methods.updateStock = function(quantity, operation = 'add') {
  if (operation === 'add') {
    this.inventory.currentStock += quantity;
  } else if (operation === 'subtract') {
    this.inventory.currentStock = Math.max(0, this.inventory.currentStock - quantity);
  } else if (operation === 'set') {
    this.inventory.currentStock = Math.max(0, quantity);
  }
  
  return this.save();
};

// Méthode pour vérifier la disponibilité
productSchema.methods.isAvailable = function(quantity = 1) {
  return this.isActive && this.inventory.currentStock >= quantity;
};

// Méthode pour obtenir le prix selon le type de client
productSchema.methods.getPrice = function(customerType = 'retail') {
  switch (customerType) {
    case 'wholesale':
      return this.pricing.wholesalePrice || this.pricing.sellingPrice;
    case 'retail':
    default:
      return this.pricing.sellingPrice;
  }
};

// Méthode statique pour rechercher des produits
productSchema.statics.searchProducts = function(query, filters = {}) {
  const searchQuery = {
    $and: [
      { isActive: true },
      filters.companyId ? { companyId: filters.companyId } : {},
      filters.storeId ? { storeId: filters.storeId } : {},
      filters.categoryId ? { categoryId: filters.categoryId } : {}
    ]
  };
  
  if (query) {
    searchQuery.$and.push({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } },
        { barcode: query }
      ]
    });
  }
  
  return this.find(searchQuery).populate('categoryId', 'name');
};

module.exports = mongoose.model('Product', productSchema);
