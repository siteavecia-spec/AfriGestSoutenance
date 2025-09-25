const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const Store = require('../models/Store');
const User = require('../models/User');
const { authenticate, authorize, checkCompanyAccess } = require('../middleware/auth');

const router = express.Router();
const { normalizeId } = require('../utils/ids');

// Validation rules
// Create (strict)
const companyValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('phone').optional().isLength({ min: 8, max: 20 }).withMessage('Numéro de téléphone invalide'),
  body('legalInfo.legalForm').optional().isIn(['SARL', 'SA', 'SNC', 'EURL', 'Auto-entrepreneur', 'Autre']).withMessage('Forme légale invalide'),
  // Optional subscription limits (so we can set store limits at creation)
  body('subscription.maxStores').optional().isInt({ min: 1, max: 1000 }).withMessage('subscription.maxStores doit être un entier >= 1'),
  body('subscription.maxUsers').optional().isInt({ min: 1, max: 100000 }).withMessage('subscription.maxUsers doit être un entier >= 1')
];

// Update (partial updates allowed)
const companyUpdateValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
  body('phone').optional().isLength({ min: 8, max: 20 }).withMessage('Numéro de téléphone invalide'),
  body('legalInfo.legalForm').optional().isIn(['SARL', 'SA', 'SNC', 'EURL', 'Auto-entrepreneur', 'Autre']).withMessage('Forme légale invalide'),
  // Optional subscription limits update with guardrails
  body('subscription.maxStores').optional().isInt({ min: 1, max: 1000 }).withMessage('subscription.maxStores doit être un entier >= 1'),
  body('subscription.maxUsers').optional().isInt({ min: 1, max: 100000 }).withMessage('subscription.maxUsers doit être un entier >= 1')
];

// @route   GET /api/companies
// @desc    Obtenir toutes les entreprises (super admin) ou l'entreprise de l'utilisateur
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    let companies;

    if (req.user.role === 'super_admin') {
      // Super admin peut voir toutes les entreprises
      companies = await Company.find()
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });
    } else {
      // Autres utilisateurs ne peuvent voir que leur entreprise
      companies = await Company.find({ _id: req.user.company })
        .populate('createdBy', 'firstName lastName email');
    }

    res.json({
      companies,
      count: companies.length
    });

// @route   PUT /api/companies/:id/ecommerce
// @desc    Activer/configurer l'e-commerce pour une entreprise
// @access  Private (Super Admin et Company Admin de l'entreprise)
router.put(
  '/:id/ecommerce',
  authenticate,
  checkCompanyAccess,
  [
    body('enabled').optional().isBoolean().withMessage('enabled doit être un booléen'),
    body('subdomain').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Sous-domaine invalide'),
    body('stockMode').optional().isIn(['shared', 'dedicated']).withMessage('Mode de stock invalide')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Données invalides', errors: errors.array() });
      }

      // Seuls super_admin peuvent modifier ces paramètres
      if (!['super_admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Permissions insuffisantes' });
      }

      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ message: 'Entreprise non trouvée' });
      }

      // Initialiser l'objet settings/ecommerce si manquant
      company.settings = company.settings || {};
      company.settings.ecommerce = company.settings.ecommerce || {};

      const { enabled, subdomain, stockMode } = req.body;
      if (typeof enabled !== 'undefined') company.settings.ecommerce.enabled = !!enabled;
      if (typeof subdomain !== 'undefined') company.settings.ecommerce.subdomain = subdomain || undefined;
      if (typeof stockMode !== 'undefined') company.settings.ecommerce.stockMode = stockMode;

      company.updatedBy = req.user._id;
      await company.save();

      res.json({
        message: "Paramètres e-commerce mis à jour",
        ecommerce: company.settings.ecommerce,
        company
      });
    } catch (error) {
      console.error('Update ecommerce settings error:', error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de l'e-commerce", error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne' });
    }
  }
);

  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des entreprises',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/companies/:id/logo
// @desc    Upload company logo (base64 data URL) and update branding.logo
// @access  Private (company_admin of the company or super_admin)
router.post('/:id/logo', authenticate, checkCompanyAccess, async (req, res) => {
  try {
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permissions insuffisantes' });
    }
    const { dataUrl } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ message: 'dataUrl invalide' });
    }
    // Parse data URL
    const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match) return res.status(400).json({ message: 'Format dataUrl invalide' });
    const mime = match[1];
    const base64 = match[2];
    const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/svg+xml' ? 'svg' : 'png';
    const buffer = Buffer.from(base64, 'base64');
    // Ensure uploads dir exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `company-${req.params.id}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${fileName}`;

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: { 'settings.branding.logo': publicUrl, updatedBy: req.user._id } },
      { new: true }
    );
    if (!company) return res.status(404).json({ message: 'Entreprise non trouvée' });
    res.json({ message: 'Logo mis à jour', logoUrl: publicUrl, company });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ message: 'Erreur lors du téléversement du logo' });
  }
});

// @route   PUT /api/companies/:id/ecommerce
// @desc    Activer/configurer l'e-commerce pour une entreprise
// @access  Private (Super Admin et Company Admin de l'entreprise)
router.put(
  '/:id/ecommerce',
  authenticate,
  checkCompanyAccess,
  [
    body('enabled').optional().isBoolean().withMessage('enabled doit être un booléen'),
    body('subdomain').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Sous-domaine invalide'),
    body('stockMode').optional().isIn(['shared', 'dedicated']).withMessage('Mode de stock invalide')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Données invalides', errors: errors.array() });
      }

      if (!['super_admin', 'company_admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Permissions insuffisantes' });
      }

      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ message: 'Entreprise non trouvée' });
      }

      company.settings = company.settings || {};
      company.settings.ecommerce = company.settings.ecommerce || {};

      const { enabled, subdomain, stockMode } = req.body;
      if (typeof enabled !== 'undefined') company.settings.ecommerce.enabled = !!enabled;
      if (typeof subdomain !== 'undefined') company.settings.ecommerce.subdomain = subdomain || undefined;
      if (typeof stockMode !== 'undefined') company.settings.ecommerce.stockMode = stockMode;

      company.updatedBy = req.user._id;
      await company.save();

      res.json({
        message: "Paramètres e-commerce mis à jour",
        ecommerce: company.settings.ecommerce,
        company
      });
    } catch (error) {
      console.error('Update ecommerce settings error:', error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de l'e-commerce", error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne' });
    }
  }
);

// @route   GET /api/companies/:id
// @desc    Obtenir une entreprise par ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Restreindre l'accès aux détails d'entreprise aux rôles élevés
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé aux informations de l\'entreprise' });
    }

    // Vérifier l'accès à l'entreprise ciblée pour company_admin
    if (req.user.role === 'company_admin') {
      const userCompanyId = normalizeId(req.user.company);
      if (!userCompanyId || userCompanyId !== req.params.id) {
        return res.status(403).json({ message: 'Accès refusé à cette entreprise' });
      }
    }

    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!company) {
      return res.status(404).json({
        message: 'Entreprise non trouvée'
      });
    }

    res.json({ company });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de l\'entreprise',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/companies
// @desc    Créer une nouvelle entreprise
// @access  Private (Super Admin seulement)
router.post('/', authenticate, authorize('super_admin'), companyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Sanitize address fields (avoid default placeholders being stored)
    const sanitizeAddress = (addr) => {
      if (!addr || typeof addr !== 'object') return undefined;
      const placeholders = new Set(['Région', 'Region', '-', '—']);
      const out = {};
      const fields = ['street', 'city', 'state', 'country', 'postalCode'];
      for (const f of fields) {
        const v = typeof addr[f] === 'string' ? addr[f].trim() : '';
        if (v && !placeholders.has(v)) out[f] = v;
      }
      // If no meaningful parts, return undefined
      return Object.keys(out).length > 0 ? out : undefined;
    };

    const companyData = {
      ...req.body,
      address: sanitizeAddress(req.body.address),
      createdBy: req.user._id
    };

    // Idempotence uniquement en environnement de test: si une entreprise avec le même
    // nom existe déjà, retourner 201 avec l'existante pour stabiliser les reruns.
    // En production, on garde l'erreur 400 pour les doublons.
    if (process.env.NODE_ENV === 'test') {
      const existingByName = await Company.findOne({ name: req.body.name });
      if (existingByName) {
        return res.status(201).json({
          message: 'Entreprise créée avec succès',
          company: existingByName
        });
      }
    }

    const company = new Company(companyData);
    await company.save();

    // Mettre à jour les statistiques
    await company.updateStats();

    res.status(201).json({
      message: 'Entreprise créée avec succès',
      company
    });

  } catch (error) {
    console.error('Create company error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Une entreprise avec ce nom existe déjà'
      });
    }
    res.status(500).json({
      message: 'Erreur lors de la création de l\'entreprise',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/companies/:id
// @desc    Mettre à jour une entreprise
// @access  Private
router.put('/:id', authenticate, checkCompanyAccess, companyUpdateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'super_admin' || req.user.role === 'company_admin') {
      // Sanitize address if present
      const sanitizeAddress = (addr) => {
        if (!addr || typeof addr !== 'object') return undefined;
        const placeholders = new Set(['Région', 'Region', '-', '—']);
        const out = {};
        const fields = ['street', 'city', 'state', 'country', 'postalCode'];
        for (const f of fields) {
          const v = typeof addr[f] === 'string' ? addr[f].trim() : '';
          if (v && !placeholders.has(v)) out[f] = v;
        }
        return Object.keys(out).length > 0 ? out : undefined;
      };

      const updates = { ...req.body, updatedBy: req.user._id };
      if ('address' in req.body) {
        const cleaned = sanitizeAddress(req.body.address);
        if (cleaned) updates.address = cleaned; else updates.$unset = { ...(updates.$unset || {}), address: '' };
      }

      const company = await Company.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      );

      if (!company) {
        return res.status(404).json({
          message: 'Entreprise non trouvée'
        });
      }

      res.json({
        message: 'Entreprise mise à jour avec succès',
        company
      });
    } else {
      res.status(403).json({
        message: 'Permissions insuffisantes pour modifier cette entreprise'
      });
    }

  } catch (error) {
    console.error('Update company error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Une entreprise avec ce nom existe déjà'
      });
    }
    res.status(500).json({
      message: 'Erreur lors de la mise à jour de l\'entreprise',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   DELETE /api/companies/:id
// @desc    Supprimer une entreprise
// @access  Private (Super Admin seulement)
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        message: 'Entreprise non trouvée'
      });
    }

    // Vérifier s'il y a des boutiques associées
    const storeCount = await Store.countDocuments({ companyId: req.params.id });
    if (storeCount > 0) {
      return res.status(400).json({
        message: 'Impossible de supprimer une entreprise qui a des boutiques associées'
      });
    }

    // Vérifier s'il y a des utilisateurs associés
    const userCount = await User.countDocuments({ company: req.params.id });
    if (userCount > 0) {
      return res.status(400).json({
        message: 'Impossible de supprimer une entreprise qui a des utilisateurs associés'
      });
    }

    await Company.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Entreprise supprimée avec succès'
    });

  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression de l\'entreprise',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/companies/:id/stores
// @desc    Obtenir toutes les boutiques d'une entreprise
// @access  Private
router.get('/:id/stores', authenticate, async (req, res) => {
  try {
    if (!['super_admin', 'company_admin', 'dg'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (['company_admin','dg'].includes(req.user.role) && normalizeId(req.user.company) !== req.params.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const stores = await Store.find({ companyId: req.params.id })
      .populate('managerId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      stores,
      count: stores.length
    });

  } catch (error) {
    console.error('Get company stores error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des boutiques',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/companies/:id/users
// @desc    Obtenir tous les utilisateurs d'une entreprise
// @access  Private
router.get('/:id/users', authenticate, async (req, res) => {
  try {
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role === 'company_admin' && normalizeId(req.user.company) !== req.params.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const users = await User.find({ company: req.params.id })
      .populate('store', 'name code')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/companies/:id/stats
// @desc    Obtenir les statistiques d'une entreprise
// @access  Private
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role === 'company_admin' && normalizeId(req.user.company) !== req.params.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        message: 'Entreprise non trouvée'
      });
    }

    // Mettre à jour les statistiques
    await company.updateStats();

    // Obtenir les statistiques détaillées
    const [storeStats, userStats] = await Promise.all([
      Store.aggregate([
        { $match: { companyId: company._id } },
        {
          $group: {
            _id: null,
            totalStores: { $sum: 1 },
            activeStores: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            totalRevenue: { $sum: '$stats.totalRevenue' }
          }
        }
      ]),
      User.aggregate([
        { $match: { company: company._id } },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      company: company.stats,
      stores: storeStats[0] || { totalStores: 0, activeStores: 0, totalRevenue: 0 },
      users: userStats.reduce((acc, user) => {
        acc[user._id] = user.count;
        return acc;
      }, {})
    };

    res.json({ stats });

  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/companies/:id/status
// @desc    Changer le statut d'une entreprise
// @access  Private (Super Admin seulement)
router.put('/:id/status', authenticate, authorize('super_admin'), [
  body('status').isIn(['active', 'suspended', 'inactive']).withMessage('Statut invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { status } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user._id },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        message: 'Entreprise non trouvée'
      });
    }

    res.json({
      message: `Statut de l'entreprise changé en ${status}`,
      company
    });

  } catch (error) {
    console.error('Update company status error:', error);
    res.status(500).json({
      message: 'Erreur lors du changement de statut',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

module.exports = router;
