const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const Store = require('../models/Store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role').isIn(['super_admin', 'company_admin', 'dg', 'accountant', 'store_accountant', 'store_manager', 'employee']).withMessage('Rôle invalide'),
  body('company').optional().isMongoId().withMessage('ID d\'entreprise invalide'),
  body('store').optional().isMongoId().withMessage('ID de boutique invalide')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
];

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-jwt-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Enregistrer un nouvel utilisateur
// @access  Private (token requis pour valider les permissions de création)
router.post('/register', authenticate, registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password, role, company, store, phone } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Vérifier les permissions de création selon le rôle
    if (role === 'super_admin') {
      // Seul un super_admin peut créer un autre super_admin
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({
          message: 'Seul un super admin peut créer un autre super admin'
        });
      }
    } else if (role === 'company_admin') {
      // Seul un super_admin peut créer un company_admin
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({
          message: 'Seul un super admin peut créer un admin d\'entreprise'
        });
      }
      
      // Vérifier que l'entreprise existe
      const companyDoc = await Company.findById(company);
      if (!companyDoc) {
        return res.status(400).json({
          message: 'Entreprise non trouvée'
        });
      }
    } else if (role === 'accountant') {
      // Un company_admin ou super_admin peut créer un comptable d'entreprise
      if (!req.user || !['super_admin', 'company_admin'].includes(req.user.role)) {
        return res.status(403).json({
          message: 'Permissions insuffisantes pour créer cet utilisateur'
        });
      }
      // Vérifier que l'entreprise existe
      const companyDoc = await Company.findById(company);
      if (!companyDoc) {
        return res.status(400).json({ message: 'Entreprise non trouvée' });
      }
    } else if (['store_manager', 'store_accountant', 'employee'].includes(role)) {
      // Un company_admin ou super_admin peut créer des rôles de boutique
      if (!req.user || !['super_admin', 'company_admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Permissions insuffisantes pour créer cet utilisateur' });
      }
      // Vérifier que l'entreprise et la boutique existent
      const [companyDoc, storeDoc] = await Promise.all([
        Company.findById(company),
        Store.findById(store)
      ]);
      if (!companyDoc) {
        return res.status(400).json({ message: 'Entreprise non trouvée' });
      }
      if (!storeDoc) {
        return res.status(400).json({ message: 'Boutique non trouvée' });
      }
      // Vérifier que la boutique appartient à l'entreprise
      if (storeDoc.companyId.toString() !== company) {
        return res.status(400).json({ message: 'La boutique n\'appartient pas à cette entreprise' });
      }
    }

    // Créer l'utilisateur
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      company: role !== 'super_admin' ? company : undefined,
      store: ['store_manager', 'store_accountant', 'employee'].includes(role) ? store : undefined,
      phone,
      createdBy: req.user?._id
    });

    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      message: 'Erreur lors de la création de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Connexion utilisateur
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Trouver l'utilisateur avec les relations
    const user = await User.findOne({ email })
      .populate('company', 'name status')
      .populate('store', 'name code status');

    if (!user) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est verrouillé
    if (user.isLocked) {
      return res.status(401).json({
        message: 'Compte verrouillé. Trop de tentatives de connexion.'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Compte désactivé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Incrémenter les tentatives de connexion
      await user.incLoginAttempts();
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Réinitialiser les tentatives de connexion
    await user.resetLoginAttempts();

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = user.toObject();
    delete userData.password;

    res.json({
      message: 'Connexion réussie',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Obtenir les informations de l'utilisateur connecté
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company', 'name status settings')
      .populate('store', 'name code status')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Ajouter les permissions
    const permissions = user.getPermissions();

    res.json({
      success: true,
      user,
      permissions
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des informations utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Alias de /me pour compatibilité
// @access  Private
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company', 'name status settings')
      .populate('store', 'name code status')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    const permissions = user.getPermissions();

    res.json({
      success: true,
      user,
      permissions
    });
  } catch (error) {
    console.error('Get user (profile alias) error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des informations utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Mettre à jour le profil utilisateur
// @access  Private
router.put('/profile', authenticate, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().trim().isLength({ min: 8, max: 20 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Interdire la modification du rôle via cette route
    if (typeof req.body.role !== 'undefined' && req.body.role !== req.user.role) {
      return res.status(403).json({ message: 'Modification du rôle interdite' });
    }

    const { firstName, lastName, phone, email } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;
    if (email) {
      // Vérifier si l'email n'est pas déjà utilisé
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      if (existingUser) {
        return res.status(400).json({
          message: 'Cet email est déjà utilisé'
        });
      }
      updates.email = email;
    }

    updates.updatedBy = req.user._id;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Changer le mot de passe
// @access  Private
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Le mot de passe actuel est requis'),
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

    const { currentPassword, newPassword } = req.body;

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.updatedBy = req.user._id;
    await user.save();

    res.json({
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Erreur lors du changement de mot de passe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Déconnexion (côté client principalement)
// @access  Private
router.post('/logout', authenticate, (req, res) => {
  res.json({
    message: 'Déconnexion réussie'
  });
});

module.exports = router;
