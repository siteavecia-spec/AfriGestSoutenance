const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const Store = require('../models/Store');
const { authenticate, authorize, canManageUsers, checkCompanyAccess, checkStoreAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const userValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role').isIn(['super_admin', 'company_admin', 'dg', 'accountant', 'store_accountant', 'store_manager', 'employee']).withMessage('Rôle invalide'),
  body('phone').optional().isLength({ min: 8, max: 20 }).withMessage('Numéro de téléphone invalide')
];

// @route   GET /api/users
// @desc    Obtenir tous les utilisateurs selon le rôle
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    let users;
    let query = {};

    if (req.user.role === 'super_admin') {
      // Super admin peut voir tous les utilisateurs
      if (req.query.company) {
        query.company = req.query.company;
      }
      if (req.query.store) {
        query.store = req.query.store;
      }
    } else if (req.user.role === 'company_admin' || req.user.role === 'dg') {
      // Company admin peut voir tous les utilisateurs de son entreprise
      query.company = req.user.company;
      if (req.query.store) {
        query.store = req.query.store;
      }
    } else if (req.user.role === 'store_manager') {
      // Store manager peut voir les utilisateurs de sa boutique
      query.store = req.user.store;
    } else {
      // Employee ne peut pas voir d'autres utilisateurs
      return res.status(403).json({
        message: 'Permissions insuffisantes pour voir les utilisateurs'
      });
    }

    // Filtres optionnels
    if (req.query.role) {
      query.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Recherche texte (nom, email, téléphone)
    if (req.query.search) {
      const term = String(req.query.search).trim();
      if (term) {
        const regex = new RegExp(term, 'i');
        query.$or = [
          { firstName: regex },
          { lastName: regex },
          { email: regex },
          { phone: regex }
        ];
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    users = await User.find(query)
      .populate('company', 'name')
      .populate('store', 'name code')
      .populate('createdBy', 'firstName lastName')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Obtenir un utilisateur par ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('company', 'name status')
      .populate('store', 'name code status')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier l'accès selon le rôle
    if ((req.user.role === 'company_admin' || req.user.role === 'dg') && user.company?.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    if (['store_manager', 'employee'].includes(req.user.role) && user.store?.toString() !== req.user.store.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    // Ajouter les permissions
    const permissions = user.getPermissions();

    res.json({
      user,
      permissions
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/users
// @desc    Créer un nouvel utilisateur
// @access  Private
router.post('/', authenticate, canManageUsers, userValidation, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, company, store, permissions } = req.body;

    // Règles de sécurité sur la création selon le rôle du créateur (prioritaires)
    // Appliquer AVANT toute autre validation/lookup pour éviter des 400 au lieu de 403 attendus
    if (req.user.role === 'company_admin' && ['super_admin', 'company_admin'].includes(role)) {
      return res.status(403).json({
        message: 'Un PDG/Admin ne peut pas créer un Super Admin ou un autre Admin entreprise.'
      });
    }
    if (req.user.role === 'store_manager' && role !== 'employee') {
      return res.status(403).json({
        message: 'Un Directeur de Boutique ne peut créer que des Employés.'
      });
    }

    // Validation de payload (après les règles de sécurité pour conserver 403 en priorité)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Rappels règles de sécurité (déjà appliquées ci-dessus)

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Déterminer l'entreprise et la boutique selon le rôle et les permissions
    let targetCompany = company;
    let targetStore = store;

    if (req.user.role === 'company_admin') {
      targetCompany = req.user.company;
    }
    
    // Pour super_admin créant un utilisateur
    // - Si le rôle créé N'EST PAS super_admin, company est requis
    // - Si le rôle créé EST super_admin, on autorise sans company
    if (req.user.role === 'super_admin' && !targetCompany && role !== 'super_admin') {
      return res.status(400).json({
        message: 'L\'ID de l\'entreprise est requis pour créer cet utilisateur'
      });
    }

    if (['store_manager', 'employee'].includes(role)) {
      if (req.user.role === 'store_manager') {
        targetStore = req.user.store;
      }
    }

    // Vérifier que l'entreprise existe
    if (targetCompany) {
      const companyDoc = await Company.findById(targetCompany);
      if (!companyDoc) {
        return res.status(400).json({
          message: 'Entreprise non trouvée'
        });
      }
    }

    // Vérifier que la boutique existe
    if (targetStore) {
      const storeDoc = await Store.findById(targetStore);
      if (!storeDoc) {
        return res.status(400).json({
          message: 'Boutique non trouvée'
        });
      }
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      company: targetCompany,
      store: targetStore,
      permissions: permissions || {},
      createdBy: req.user._id
    });

    await user.save();

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: userData
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      message: 'Erreur lors de la création de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Mettre à jour un utilisateur
// @access  Private
router.put('/:id', authenticate, canManageUsers, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isLength({ min: 8, max: 20 }),
  body('role').optional().isIn(['super_admin', 'company_admin', 'dg', 'accountant', 'store_accountant', 'store_manager', 'employee'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier l'accès
    if (req.user.role === 'company_admin' && user.company?.toString() !== req.user.company?.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    if (req.user.role === 'store_manager' && user.store?.toString() !== req.user.store?.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    const { firstName, lastName, email, phone, role, permissions, isActive } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;
    // Empêcher l'élévation de privilèges via la mise à jour du rôle
    if (role) {
      if (req.user.role === 'company_admin' && ['super_admin', 'company_admin'].includes(role)) {
        return res.status(403).json({
          message: 'Un PDG/Admin ne peut pas attribuer les rôles Super Admin ou Admin entreprise.'
        });
      }
      if (req.user.role === 'store_manager' && !['employee'].includes(role)) {
        return res.status(403).json({
          message: 'Un Directeur de Boutique ne peut attribuer que le rôle Employé.'
        });
      }
      updates.role = role;
    }
    if (permissions) updates.permissions = permissions;
    if (isActive !== undefined) updates.isActive = isActive;

    if (email && email !== user.email) {
      // Vérifier si l'email n'est pas déjà utilisé
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(400).json({
          message: 'Cet email est déjà utilisé'
        });
      }
      updates.email = email;
    }

    updates.updatedBy = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Utilisateur mis à jour avec succès',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Supprimer un utilisateur
// @access  Private
router.delete('/:id', authenticate, canManageUsers, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier l'accès
    if (req.user.role === 'company_admin' && user.company?.toString() !== req.user.company?.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    if (req.user.role === 'store_manager' && user.store?.toString() !== req.user.store?.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    // Empêcher la suppression de son propre compte
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Marquer comme inactif au lieu de supprimer
    user.isActive = false;
    user.updatedBy = req.user._id;
    await user.save();

    res.json({
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Réinitialiser le mot de passe d'un utilisateur
// @access  Private
router.put('/:id/password', authenticate, canManageUsers, [
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { newPassword } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier l'accès
    if (req.user.role === 'company_admin' && user.companyId?.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    if (req.user.role === 'store_manager' && user.storeId?.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.updatedBy = req.user._id;
    await user.save();

    res.json({
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Erreur lors de la réinitialisation du mot de passe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Changer le statut d'un utilisateur
// @access  Private
router.put('/:id/status', authenticate, canManageUsers, [
  body('isActive').isBoolean().withMessage('Le statut doit être un booléen')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier l'accès
    if (req.user.role === 'company_admin' && user.companyId?.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    if (req.user.role === 'store_manager' && user.storeId?.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cet utilisateur'
      });
    }

    // Empêcher la désactivation de son propre compte
    if (user._id.toString() === req.user._id.toString() && !isActive) {
      return res.status(400).json({
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    user.isActive = isActive;
    user.updatedBy = req.user._id;
    await user.save();

    res.json({
      message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      message: 'Erreur lors du changement de statut',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/users/stats/summary
// @desc    Obtenir les statistiques des utilisateurs
// @access  Private
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    let matchStage = {};

    // Filtrer selon le rôle
    if (req.user.role === 'company_admin' || req.user.role === 'dg') {
      matchStage.company = req.user.company;
      const storeParam = req.query.store || req.query.storeId;
      if (storeParam) {
        matchStage.store = storeParam;
      }
    } else if (req.user.role === 'store_manager') {
      matchStage.store = req.user.store;
    } else if (req.user.role === 'employee') {
      return res.status(403).json({
        message: 'Permissions insuffisantes pour voir les statistiques'
      });
    }

    const stats = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveUsers: { $sum: { $cond: ['$isActive', 0, 1] } },
          byRole: {
            $push: {
              role: '$role',
              isActive: '$isActive'
            }
          }
        }
      }
    ]);

    // Statistiques par rôle
    const roleStats = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    res.json({
      summary: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0
      },
      byRole: roleStats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

module.exports = router;
