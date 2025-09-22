const express = require('express');
const { body, validationResult } = require('express-validator');
const Store = require('../models/Store');
const Company = require('../models/Company');
const User = require('../models/User');
const { authenticate, authorize, checkStoreAccess, checkCompanyAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const storeValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('code').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Le code doit contenir entre 2 et 20 caractères'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
  body('phone').optional().isLength({ min: 8, max: 20 }).withMessage('Numéro de téléphone invalide'),
  body('type').optional().isIn(['physical', 'virtual', 'hybrid']).withMessage('Type de boutique invalide'),
  body('managerId').optional().isMongoId().withMessage('ID du gestionnaire invalide')
];

// @route   GET /api/stores
// @desc    Obtenir toutes les boutiques selon le rôle de l'utilisateur
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    // Pagination sécurisée
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Construire le filtre en fonction du rôle
    const query = {};
    if (req.user.role === 'super_admin') {
      // Pas de filtre supplémentaire
    } else if (req.user.role === 'company_admin') {
      // Company admin: filtrer par son entreprise
      const companyId = req.user.company?._id || req.user.company; // gère doc peuplé ou ObjectId
      if (companyId) query.companyId = companyId;
    } else {
      // Store manager / employee: restreindre à leur boutique
      const storeId = req.user.store?._id || req.user.store; // gère doc peuplé ou ObjectId
      if (storeId) query._id = storeId;
      else return res.status(403).json({ message: 'Accès refusé à la ressource boutiques' });
    }

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('companyId', 'name')
        .populate('managerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(query),
    ]);

    res.json({
      success: true,
      stores,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des boutiques',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/stores/:id
// @desc    Obtenir une boutique par ID
// @access  Private
router.get('/:id', authenticate, checkStoreAccess, async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('companyId', 'name status')
      .populate('managerId', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!store) {
      return res.status(404).json({
        message: 'Boutique non trouvée'
      });
    }

    res.json({ success: true, store });

  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de la boutique',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/stores
// @desc    Créer une nouvelle boutique
// @access  Private (Company Admin et Super Admin)
router.post('/', authenticate, authorize('company_admin', 'super_admin'), storeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { companyId, managerId, ...storeData } = req.body;

    // Déterminer l'entreprise
    let targetCompanyId = companyId;
    if (req.user.role === 'company_admin') {
      targetCompanyId = req.user.company;
    }
    
    // Pour super_admin, companyId est obligatoire
    if (req.user.role === 'super_admin' && !targetCompanyId) {
      return res.status(400).json({
        message: 'L\'ID de l\'entreprise est requis pour créer une boutique'
      });
    }

    // Vérifier que l'entreprise existe et est active
    const companyDoc = await Company.findById(targetCompanyId);
    if (!companyDoc) {
      return res.status(404).json({
        message: 'Entreprise non trouvée'
      });
    }

    if (companyDoc.status !== 'active') {
      return res.status(400).json({
        message: 'L\'entreprise n\'est pas active'
      });
    }

    // Vérifier les limites d'abonnement
    const currentStoreCount = await Store.countDocuments({ companyId: targetCompanyId, isActive: true });
    if (currentStoreCount >= companyDoc.subscription.maxStores) {
      return res.status(400).json({
        message: 'Limite de boutiques atteinte pour cet abonnement'
      });
    }

    // Vérifier le gestionnaire si fourni
    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager || manager.company.toString() !== targetCompanyId) {
        return res.status(400).json({
          message: 'Gestionnaire invalide'
        });
      }
    }

    const store = new Store({
      ...storeData,
      companyId: targetCompanyId,
      managerId,
      createdBy: req.user._id
    });

    await store.save();

    // Mettre à jour les statistiques de l'entreprise
    await companyDoc.updateStats();

    res.status(201).json({
      message: 'Boutique créée avec succès',
      store
    });

  } catch (error) {
    console.error('Create store error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Une boutique avec ce code existe déjà dans cette entreprise'
      });
    }
    res.status(500).json({
      message: 'Erreur lors de la création de la boutique',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/stores/:id
// @desc    Mettre à jour une boutique
// @access  Private
router.put('/:id', authenticate, checkStoreAccess, storeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Vérifier les permissions
    const canEdit = ['super_admin', 'company_admin'].includes(req.user.role) || 
                   (req.user.role === 'store_manager' && req.user.storeId.toString() === req.params.id);

    if (!canEdit) {
      return res.status(403).json({
        message: 'Permissions insuffisantes pour modifier cette boutique'
      });
    }

    const { managerId, ...updateData } = req.body;

    // Vérifier le gestionnaire si fourni
    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager || manager.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(400).json({
          message: 'Gestionnaire invalide'
        });
      }
    }

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { ...updateData, managerId, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!store) {
      return res.status(404).json({
        message: 'Boutique non trouvée'
      });
    }

    res.json({
      message: 'Boutique mise à jour avec succès',
      store
    });

  } catch (error) {
    console.error('Update store error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Une boutique avec ce code existe déjà dans cette entreprise'
      });
    }
    res.status(500).json({
      message: 'Erreur lors de la mise à jour de la boutique',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   DELETE /api/stores/:id
// @desc    Supprimer une boutique
// @access  Private (Company Admin et Super Admin)
router.delete('/:id', authenticate, authorize('company_admin', 'super_admin'), async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({
        message: 'Boutique non trouvée'
      });
    }

    // Vérifier l'accès à l'entreprise
    if (req.user.role === 'company_admin' && store.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à cette boutique'
      });
    }

    // Vérifier s'il y a des utilisateurs associés
    const userCount = await User.countDocuments({ storeId: req.params.id });
    if (userCount > 0) {
      return res.status(400).json({
        message: 'Impossible de supprimer une boutique qui a des utilisateurs associés'
      });
    }

    await Store.findByIdAndDelete(req.params.id);

    // Mettre à jour les statistiques de l'entreprise
    const company = await Company.findById(store.companyId);
    if (company) {
      await company.updateStats();
    }

    res.json({
      message: 'Boutique supprimée avec succès'
    });

  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression de la boutique',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/stores/:id/users
// @desc    Obtenir tous les utilisateurs d'une boutique
// @access  Private
router.get('/:id/users', authenticate, checkStoreAccess, async (req, res) => {
  try {
    const users = await User.find({ storeId: req.params.id })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Get store users error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/stores/:id/stats
// @desc    Obtenir les statistiques d'une boutique
// @access  Private
router.get('/:id/stats', authenticate, checkStoreAccess, async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({
        message: 'Boutique non trouvée'
      });
    }

    // Mettre à jour les statistiques
    await store.updateStats();

    // Obtenir les statistiques détaillées
    const userStats = await User.aggregate([
      { $match: { storeId: store._id } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      store: store.stats,
      users: userStats.reduce((acc, user) => {
        acc[user._id] = user.count;
        return acc;
      }, {})
    };

    res.json({ stats });

  } catch (error) {
    console.error('Get store stats error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/stores/:id/status
// @desc    Changer le statut d'une boutique
// @access  Private
router.put('/:id/status', authenticate, checkStoreAccess, [
  body('status').isIn(['active', 'inactive', 'maintenance']).withMessage('Statut invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Vérifier les permissions
    const canEdit = ['super_admin', 'company_admin'].includes(req.user.role) || 
                   (req.user.role === 'store_manager' && req.user.storeId.toString() === req.params.id);

    if (!canEdit) {
      return res.status(403).json({
        message: 'Permissions insuffisantes pour modifier le statut de cette boutique'
      });
    }

    const { status } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user._id },
      { new: true }
    );

    if (!store) {
      return res.status(404).json({
        message: 'Boutique non trouvée'
      });
    }

    res.json({
      message: `Statut de la boutique changé en ${status}`,
      store
    });

  } catch (error) {
    console.error('Update store status error:', error);
    res.status(500).json({
      message: 'Erreur lors du changement de statut',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/stores/:id/cash-register/reset
// @desc    Réinitialiser la caisse
// @access  Private
router.put('/:id/cash-register/reset', authenticate, checkStoreAccess, [
  body('amount').isNumeric().withMessage('Le montant doit être un nombre')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Vérifier les permissions
    const canEdit = ['super_admin', 'company_admin'].includes(req.user.role) || 
                   (req.user.role === 'store_manager' && req.user.storeId.toString() === req.params.id);

    if (!canEdit) {
      return res.status(403).json({
        message: 'Permissions insuffisantes pour réinitialiser la caisse'
      });
    }

    const { amount } = req.body;
    const store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({
        message: 'Boutique non trouvée'
      });
    }

    await store.resetCashRegister(amount);

    res.json({
      message: 'Caisse réinitialisée avec succès',
      cashRegister: store.settings.cashRegister
    });

  } catch (error) {
    console.error('Reset cash register error:', error);
    res.status(500).json({
      message: 'Erreur lors de la réinitialisation de la caisse',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

module.exports = router;
