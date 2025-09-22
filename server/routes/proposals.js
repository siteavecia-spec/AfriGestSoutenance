const express = require('express');
const { body, validationResult } = require('express-validator');
const Proposal = require('../models/Proposal');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const Store = require('../models/Store');
const { authenticate, checkPermission } = require('../middleware/auth');
const { recordAudit } = require('../services/auditService');

const router = express.Router();

// Submit a proposal (create or update product)
router.post(
  '/',
  authenticate,
  [
    body('targetEntityType').equals('product').withMessage('targetEntityType doit être "product"'),
    body('proposedChanges').isObject().withMessage('proposedChanges requis'),
    body('targetId').optional().isMongoId().withMessage('targetId invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Données invalides', errors: errors.array() });
      }

      const { targetEntityType, targetId, proposedChanges } = req.body;

      // If updating an existing product, validate ownership constraints
      if (targetId) {
        const product = await Product.findById(targetId).select('companyId storeId');
        if (!product) return res.status(404).json({ message: 'Produit introuvable' });
        // company_admin limited to their company; store roles to their store
        if (req.user.role === 'company_admin') {
          if (String(product.companyId) !== String(req.user.company?._id || req.user.company)) {
            return res.status(403).json({ message: 'Accès refusé à ce produit' });
          }
        } else if (['store_manager', 'employee'].includes(req.user.role)) {
          if (String(product.storeId) !== String(req.user.store?._id || req.user.store)) {
            return res.status(403).json({ message: 'Accès refusé à ce produit' });
          }
        }
      }

      // Résoudre companyId et storeId de manière robuste
      let resolvedCompanyId = req.user.company?._id || req.user.company || null;
      let resolvedStoreId = req.user.store?._id || req.user.store || proposedChanges?.storeId || null;

      if (!resolvedCompanyId && resolvedStoreId) {
        const storeDoc = await Store.findById(resolvedStoreId).select('companyId');
        if (storeDoc) {
          resolvedCompanyId = storeDoc.companyId;
        }
      }

      const proposal = await Proposal.create({
        companyId: resolvedCompanyId,
        storeId: resolvedStoreId,
        targetEntityType,
        targetId: targetId || undefined,
        proposedChanges,
        status: 'pending',
        submittedBy: req.user._id,
      });

      await recordAudit(
        {
          entityType: 'proposal',
          entityId: proposal._id,
          action: 'proposal_submitted',
          changes: proposedChanges,
          meta: { targetEntityType, targetId },
        },
        req
      );

      await Notification.create({
        userId: req.user._id,
        companyId: resolvedCompanyId,
        storeId: resolvedStoreId,
        message: targetId
          ? `Proposition de modification du produit #${targetId} soumise`
          : 'Proposition de création de produit soumise',
        severity: 'info',
        meta: { proposalId: proposal._id },
      });

      res.status(201).json({ message: 'Proposition soumise', proposal });
    } catch (e) {
      console.error('Submit proposal error:', e);
      res.status(500).json({ message: 'Erreur lors de la soumission de la proposition' });
    }
  }
);

// List proposals (restricted by role scope)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (req.user.role === 'super_admin') {
      if (req.query.companyId) filter.companyId = req.query.companyId;
    } else if (req.user.role === 'company_admin') {
      filter.companyId = req.user.company?._id || req.user.company;
    } else {
      filter.storeId = req.user.store?._id || req.user.store;
    }

    const [items, total] = await Promise.all([
      Proposal.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'firstName lastName role')
        .populate('reviewedBy', 'firstName lastName role')
        .lean(),
      Proposal.countDocuments(filter),
    ]);

    res.json({ proposals: items, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
  } catch (e) {
    console.error('List proposals error:', e);
    res.status(500).json({ message: 'Erreur lors du chargement des propositions' });
  }
});

// Get one
router.get('/:id', authenticate, async (req, res) => {
  try {
    const prop = await Proposal.findById(req.params.id).populate('submittedBy', 'firstName lastName role');
    if (!prop) return res.status(404).json({ message: 'Proposition introuvable' });

    if (req.user.role === 'company_admin') {
      if (String(prop.companyId) !== String(req.user.company?._id || req.user.company)) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      if (String(prop.storeId) !== String(req.user.store?._id || req.user.store)) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    }

    res.json({ proposal: prop });
  } catch (e) {
    console.error('Get proposal error:', e);
    res.status(500).json({ message: 'Erreur lors du chargement de la proposition' });
  }
});

// Approve proposal (company_admin or higher with inventory management)
router.put('/:id/approve', authenticate, checkPermission('canManageInventory'), async (req, res) => {
  try {
    const prop = await Proposal.findById(req.params.id);
    if (!prop) return res.status(404).json({ message: 'Proposition introuvable' });
    if (prop.status !== 'pending') return res.status(400).json({ message: 'Proposition déjà traitée' });

    // Scope check
    if (req.user.role === 'company_admin') {
      if (String(prop.companyId) !== String(req.user.company?._id || req.user.company)) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      // Managers/employees typically shouldn't approve; permission gate should block.
      return res.status(403).json({ message: 'Rôle insuffisant pour valider' });
    }

    let product;
    if (prop.targetId) {
      // Update existing product
      product = await Product.findOneAndUpdate(
        { _id: prop.targetId, companyId: prop.companyId },
        { $set: { ...prop.proposedChanges, updatedBy: req.user._id } },
        { new: true, runValidators: true }
      );
      if (!product) return res.status(404).json({ message: 'Produit cible introuvable' });
    } else {
      // Create new product
      product = new Product({
        ...prop.proposedChanges,
        companyId: prop.companyId,
        storeId: prop.storeId || (req.user.store?._id || req.user.store),
        createdBy: req.user._id,
      });
      await product.save();
    }

    prop.status = 'approved';
    prop.reviewedBy = req.user._id;
    prop.reviewedAt = new Date();
    prop.reason = req.body?.reason || undefined;
    await prop.save();

    await recordAudit({ entityType: 'proposal', entityId: prop._id, action: 'proposal_approved', changes: prop.proposedChanges, meta: { productId: product._id } }, req);
    await recordAudit({ entityType: 'product', entityId: product._id, action: prop.targetId ? 'update' : 'create', changes: prop.proposedChanges, meta: { proposalId: prop._id } }, req);

    await Notification.create({
      userId: prop.submittedBy,
      companyId: prop.companyId,
      storeId: prop.storeId,
      message: 'Votre proposition a été validée',
      severity: 'success',
      meta: { proposalId: prop._id, productId: product._id },
    });

    res.json({ message: 'Proposition validée', proposal: prop, product });
  } catch (e) {
    console.error('Approve proposal error:', e);
    res.status(500).json({ message: 'Erreur lors de la validation' });
  }
});

// Reject proposal
router.put('/:id/reject', authenticate, checkPermission('canManageInventory'), async (req, res) => {
  try {
    const prop = await Proposal.findById(req.params.id);
    if (!prop) return res.status(404).json({ message: 'Proposition introuvable' });
    if (prop.status !== 'pending') return res.status(400).json({ message: 'Proposition déjà traitée' });

    if (req.user.role === 'company_admin') {
      if (String(prop.companyId) !== String(req.user.company?._id || req.user.company)) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Rôle insuffisant pour rejeter' });
    }

    prop.status = 'rejected';
    prop.reviewedBy = req.user._id;
    prop.reviewedAt = new Date();
    prop.reason = req.body?.reason || 'Non précisé';
    await prop.save();

    await recordAudit({ entityType: 'proposal', entityId: prop._id, action: 'proposal_rejected', changes: prop.proposedChanges, meta: { reason: prop.reason } }, req);

    await Notification.create({
      userId: prop.submittedBy,
      companyId: prop.companyId,
      storeId: prop.storeId,
      message: 'Votre proposition a été rejetée',
      severity: 'warning',
      meta: { proposalId: prop._id, reason: prop.reason },
    });

    res.json({ message: 'Proposition rejetée', proposal: prop });
  } catch (e) {
    console.error('Reject proposal error:', e);
    res.status(500).json({ message: 'Erreur lors du rejet' });
  }
});

module.exports = router;
