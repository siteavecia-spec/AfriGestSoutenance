const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Informations de base
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
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Numéro de téléphone invalide']
  },
  
  // Rôles et permissions
  role: {
    type: String,
    enum: ['super_admin', 'company_admin', 'dg', 'accountant', 'store_accountant', 'store_manager', 'employee'],
    required: true
  },
  
  // Relations multi-tenant
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      return this.role !== 'super_admin';
    }
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: function() {
      return ['store_manager', 'store_accountant', 'employee'].includes(this.role);
    }
  },
  
  // Permissions spécifiques
  permissions: {
    canManageUsers: { type: Boolean, default: false },
    canViewAccounting: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: false },
    canProcessSales: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: false }
  },
  
  // Statut et sécurité
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  
  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
userSchema.index({ email: 1 });
userSchema.index({ company: 1, role: 1 });
userSchema.index({ store: 1, role: 1 });

// Virtual pour le nom complet
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual pour vérifier si le compte est verrouillé
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware pre-save pour hasher le mot de passe
userSchema.pre('save', async function(next) {
  try {
    // Vérifier l'unicité de l'email si modifié/création
    if (this.isModified('email')) {
      const existing = await mongoose.model('User').findOne({ email: this.email.toLowerCase() });
      if (existing && existing._id.toString() !== this._id.toString()) {
        return next(new Error('Email déjà utilisé'));
      }
    }

    // Hachage du mot de passe si modifié
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir le nom complet
userSchema.methods.getFullName = function() {
  return this.fullName;
};

// Méthode pour obtenir les données publiques (sans mot de passe)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  return userObject;
};

// Méthode pour incrémenter les tentatives de connexion
userSchema.methods.incLoginAttempts = function() {
  // Si on a un verrou précédent et qu'il a expiré
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Verrouiller le compte après 5 tentatives échouées
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 heures
  }
  
  return this.updateOne(updates);
};

// Méthode pour réinitialiser les tentatives de connexion
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Méthode pour obtenir les permissions selon le rôle
userSchema.methods.getPermissions = function() {
  const rolePermissions = {
    super_admin: {
      // Permissions de concepteur/créateur uniquement
      canManageSystem: true,        // Gestion du système global
      canManageCompanies: true,     // Créer/supprimer des entreprises
      canManageSuperAdmins: true,   // Créer d'autres super admins
      canViewGlobalReports: true,   // Rapports de toutes les entreprises
      // Pas de gestion opérationnelle directe
      canManageUsers: false,        // Pas de gestion directe des utilisateurs
      canViewAccounting: true,      // Autoriser l'accès comptabilité pour tests/API
      canManageInventory: true,     // Autoriser validation/rejet des propositions et gestion inventaire si nécessaire
      canProcessSales: true,        // Autoriser ventes pour tests/API
      canViewReports: true          // Autoriser l'accès rapports pour tests/API
    },
    company_admin: {
      // Permissions de PDG/Admin d'entreprise
      canManageSystem: false,
      canManageCompanies: false,
      canManageSuperAdmins: false,
      canViewGlobalReports: false,
      canManageUsers: true,         // Gestion des utilisateurs de son entreprise
      canViewAccounting: true,      // Comptabilité de son entreprise
      canManageInventory: true,     // Inventaire de son entreprise
      canProcessSales: true,        // Ventes de son entreprise
      canViewReports: true          // Rapports de son entreprise
    },
    dg: {
      // Permissions de Directeur Général (lecture seule)
      canManageSystem: false,
      canManageCompanies: false,
      canManageSuperAdmins: false,
      canViewGlobalReports: false,
      canManageUsers: false,        // Lecture seule des utilisateurs
      canViewAccounting: true,      // Consultation comptabilité
      canManageInventory: false,    // Lecture seule inventaire
      canProcessSales: false,       // Lecture seule ventes
      canViewReports: true          // Consultation rapports
    },
    accountant: {
      // Comptable d'entreprise (lecture)
      canManageSystem: false,
      canManageCompanies: false,
      canManageSuperAdmins: false,
      canViewGlobalReports: false,
      canManageUsers: false,
      canViewAccounting: true,
      canManageInventory: false,
      canProcessSales: false,
      canViewReports: true
    },
    store_accountant: {
      // Comptable de boutique (lecture boutique)
      canManageSystem: false,
      canManageCompanies: false,
      canManageSuperAdmins: false,
      canViewGlobalReports: false,
      canManageUsers: false,
      canViewAccounting: true,
      canManageInventory: false,
      canProcessSales: false,
      canViewReports: true
    },
    store_manager: {
      // Permissions de Manager de boutique
      canManageSystem: false,
      canManageCompanies: false,
      canManageSuperAdmins: false,
      canViewGlobalReports: false,
      canManageUsers: false,        // Gestion des employés de sa boutique
      canViewAccounting: true,      // Comptabilité de sa boutique
      canManageInventory: true,     // Inventaire de sa boutique
      canProcessSales: true,        // Ventes de sa boutique
      canViewReports: true          // Rapports de sa boutique
    },
    employee: {
      // Permissions d'employé
      canManageSystem: false,
      canManageCompanies: false,
      canManageSuperAdmins: false,
      canViewGlobalReports: false,
      canManageUsers: false,
      canViewAccounting: false,     // Pas d'accès comptabilité
      canManageInventory: false,    // Gestion stocks limitée
      canProcessSales: true,        // Création de ventes
      canViewReports: false         // Pas d'accès rapports
    }
  };
  
  // Les permissions de rôle doivent prévaloir sur les surcharges documentaires par défaut
  return { ...this.permissions, ...rolePermissions[this.role] };
};

// Méthodes statiques
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role: role });
};

module.exports = mongoose.model('User', userSchema);
