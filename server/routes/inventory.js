// Middleware allowing inventory management for specific roles or permission
function allowManageInventory(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
    const allowedRoles = new Set(['super_admin', 'company_admin', 'dg']);
    if (allowedRoles.has(req.user.role)) return next();
    if (req.user.permissions && req.user.permissions.canManageInventory) return next();
    return res.status(403).json({ message: 'Permissions insuffisantes' });
  } catch (e) {
    return res.status(500).json({ message: 'Erreur d\'autorisation' });
  }
}
const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Store = require('../models/Store');
const { authenticate, checkStoreAccess, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Static sector templates (can be moved to DB later)
const SECTOR_TEMPLATES = [
  {
    sector: 'generic',
    label: 'Générique',
    attributes: [],
    searchableKeys: [],
  },
  {
    sector: 'retail',
    label: 'Commerce de détail',
    attributes: [
      { key: 'supplier', label: 'Fournisseur', type: 'string' },
      { key: 'ref', label: 'Référence', type: 'string' },
      { key: 'promoPrice', label: 'Prix promotionnel', type: 'number' },
      { key: 'minShelfStock', label: 'Stock minimum en rayon', type: 'number' },
    ],
    searchableKeys: ['supplier','ref'],
  },
  {
    sector: 'restaurant',
    label: 'Restaurant / Café',
    attributes: [
      { key: 'ingredients', label: 'Ingrédients', type: 'string' },
      { key: 'allergens', label: 'Allergènes', type: 'string' },
      { key: 'prepTime', label: 'Temps de préparation (min)', type: 'number' },
      { key: 'bomCost', label: 'Coût matière première', type: 'number' },
      { key: 'recipeRef', label: 'Recette associée', type: 'string' },
    ],
    searchableKeys: ['ingredients','allergens'],
  },
  {
    sector: 'fashion',
    label: 'Mode',
    attributes: [
      { key: 'size', label: 'Taille', type: 'string' },
      { key: 'color', label: 'Couleur', type: 'string' },
      { key: 'material', label: 'Matière', type: 'string' },
      { key: 'season', label: 'Saison / Collection', type: 'string' },
    ],
    searchableKeys: ['size','color','season'],
  },
  {
    sector: 'electronics',
    label: 'Électronique / Informatique',
    attributes: [
      { key: 'brand', label: 'Marque', type: 'string' },
      { key: 'model', label: 'Modèle', type: 'string' },
      { key: 'serialNumber', label: 'Numéro de série', type: 'string' },
      { key: 'warrantyMonths', label: 'Garantie (mois)', type: 'number' },
      { key: 'ram', label: 'RAM', type: 'string' },
      { key: 'storage', label: 'Stockage', type: 'string' },
      { key: 'cpu', label: 'Processeur', type: 'string' },
    ],
    searchableKeys: ['brand','model','serialNumber'],
  },
  {
    sector: 'pharmacy',
    label: 'Pharmacie',
    attributes: [
      { key: 'dci', label: 'DCI', type: 'string' },
      { key: 'dosage', label: 'Dosage', type: 'string' },
      { key: 'galenic', label: 'Forme galénique', type: 'string' },
      { key: 'lot', label: 'Numéro de lot', type: 'string' },
      { key: 'expiryDate', label: 'Date d\'expiration', type: 'date' },
    ],
    searchableKeys: ['dci','dosage','lot'],
  },
  {
    sector: 'grocery',
    label: 'Supérette',
    attributes: [
      { key: 'category', label: 'Catégorie', type: 'string' },
      { key: 'expiryDate', label: 'Date de péremption', type: 'date' },
      { key: 'supplier', label: 'Fournisseur', type: 'string' },
      { key: 'shelfStock', label: 'Stock en rayon', type: 'number' },
    ],
    searchableKeys: ['category','supplier'],
  },
  {
    sector: 'beauty',
    label: 'Beauté',
    attributes: [
      { key: 'brand', label: 'Marque', type: 'string' },
      { key: 'line', label: 'Gamme', type: 'string' },
      { key: 'keyIngredients', label: 'Ingrédients clés', type: 'string' },
      { key: 'expiryDate', label: 'Date d\'expiration', type: 'date' },
      { key: 'variant', label: 'Variante', type: 'string' },
    ],
    searchableKeys: ['brand','line','variant'],
  },
];

// @route   GET /api/inventory/sectors/templates
// @desc    Liste des templates sectoriels
// @access  Private
router.get('/sectors/templates', authenticate, async (_req, res) => {
  try {
    res.json({ templates: SECTOR_TEMPLATES });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des templates' });
  }
});

// Validation rules
const productValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Le nom doit contenir entre 2 et 200 caractères'),
  body('sku').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Le SKU doit contenir entre 2 et 50 caractères'),
  body('pricing.costPrice').isNumeric({ min: 0 }).withMessage('Le prix de revient doit être positif'),
  body('pricing.sellingPrice').isNumeric({ min: 0 }).withMessage('Le prix de vente doit être positif'),
  body('inventory.currentStock').isInt({ min: 0 }).withMessage('Le stock doit être un entier positif'),
  body('inventory.minStock').isInt({ min: 0 }).withMessage('Le stock minimum doit être un entier positif')
];

const stockUpdateValidation = [
  body('quantity').isInt().withMessage('La quantité doit être un entier'),
  body('operation').isIn(['add', 'subtract', 'set']).withMessage('Opération invalide'),
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('La raison ne peut pas dépasser 200 caractères')
];

// @route   GET /api/inventory/products
// @desc    Obtenir tous les produits selon le rôle de l'utilisateur
// @access  Private
router.get('/products', authenticate, async (req, res) => {
  try {
    let products;
    let query = {};

    // Filtrer selon le rôle
    if (req.user.role === 'super_admin') {
      // Super admin peut voir tous les produits
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
      if (req.query.storeId) {
        query.storeId = req.query.storeId;
      }
    } else if (req.user.role === 'company_admin') {
      // Company admin peut voir tous les produits de son entreprise
      query.companyId = (req.user.company && req.user.company._id) ? req.user.company._id : req.user.company;
      if (req.query.storeId) {
        query.storeId = req.query.storeId;
      }
    } else {
      // Store manager et employee ne peuvent voir que les produits de leur boutique
      query.storeId = (req.user.store && req.user.store._id) ? req.user.store._id : req.user.store;
    }

    // Filtres optionnels
    if (req.query.categoryId) {
      query.categoryId = req.query.categoryId;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    if (req.query.lowStock === 'true') {
      // Les produits avec stock faible seront filtrés après la requête
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('storeId', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filtrer les produits avec stock faible si demandé
    if (req.query.lowStock === 'true') {
      products = products.filter(product => product.isLowStock);
    }

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des produits',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/inventory/products/:id
// @desc    Obtenir un produit par ID
// @access  Private
router.get('/products/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('storeId', 'name code')
      .populate('companyId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        message: 'Produit non trouvé'
      });
    }

    // Vérifier l'accès selon le rôle
    if (req.user.role === 'company_admin') {
      const userCompanyId = (req.user.company && req.user.company._id) ? req.user.company._id.toString() : (req.user.company ? req.user.company.toString() : undefined);
      if (!userCompanyId || product.companyId.toString() !== userCompanyId) {
        return res.status(403).json({ message: 'Accès refusé à ce produit' });
      }
    }

    if (['store_manager', 'employee'].includes(req.user.role)) {
      const userStoreId = (req.user.store && req.user.store._id) ? req.user.store._id.toString() : (req.user.store ? req.user.store.toString() : undefined);
      if (!userStoreId || product.storeId.toString() !== userStoreId) {
        return res.status(403).json({ message: 'Accès refusé à ce produit' });
      }
    }

    res.json({ product });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/inventory/products
// @desc    Créer un nouveau produit
// @access  Private
router.post('/products', authenticate, allowManageInventory, productValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { storeId, categoryId, ...productData } = req.body;

    // Déterminer la boutique
    let targetStoreId = storeId;
    if (['store_manager', 'employee'].includes(req.user.role)) {
      targetStoreId = (req.user.store && req.user.store._id) ? req.user.store._id : req.user.store;
    }

    // Vérifier que la boutique existe et est active
    const store = await Store.findById(targetStoreId);
    if (!store) {
      return res.status(404).json({
        message: 'Boutique non trouvée'
      });
    }

    if (store.status !== 'active') {
      return res.status(400).json({
        message: 'La boutique n\'est pas active'
      });
    }

    // Vérifier la catégorie si fournie
    if (categoryId) {
      const userCompanyId = (req.user.company && req.user.company._id) ? req.user.company._id : req.user.company;
      const category = await Category.findOne({ 
        _id: categoryId, 
        companyId: userCompanyId 
      });
      if (!category) {
        return res.status(400).json({
          message: 'Catégorie non trouvée'
        });
      }
    }

    // Auto-générer SKU si manquant et vérifier pricing
    const sku = productData.sku || `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (productData?.pricing) {
      const { costPrice, sellingPrice } = productData.pricing;
      if (typeof costPrice === 'number' && costPrice < 0) {
        return res.status(400).json({ message: 'Le prix de revient doit être positif' });
      }
      if (typeof sellingPrice === 'number' && sellingPrice < 0) {
        return res.status(400).json({ message: 'Le prix de vente doit être positif' });
      }
      if (typeof costPrice === 'number' && typeof sellingPrice === 'number' && sellingPrice < costPrice) {
        return res.status(400).json({ message: 'Le prix de vente doit être supérieur ou égal au prix de revient' });
      }
    }

    const userCompanyId = (req.user.company && req.user.company._id) ? req.user.company._id : req.user.company;
    const product = new Product({
      ...productData,
      sku,
      companyId: userCompanyId,
      storeId: targetStoreId,
      categoryId,
      createdBy: req.user._id
    });

    await product.save();

    res.status(201).json({
      message: 'Produit créé avec succès',
      product
    });

  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Un produit avec ce SKU existe déjà dans cette entreprise'
      });
    }
    res.status(500).json({
      message: 'Erreur lors de la création du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/inventory/products/:id
// @desc    Mettre à jour un produit
// @access  Private
router.put('/products/:id', authenticate, allowManageInventory, productValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        message: 'Produit non trouvé'
      });
    }

    // Vérifier l'accès
    if (req.user.role === 'company_admin') {
      const userCompanyId = (req.user.company && req.user.company._id) ? req.user.company._id.toString() : (req.user.company ? req.user.company.toString() : undefined);
      if (!userCompanyId || product.companyId.toString() !== userCompanyId) {
        return res.status(403).json({ message: 'Accès refusé à ce produit' });
      }
    }

    if (['store_manager', 'employee'].includes(req.user.role)) {
      const userStoreId = (req.user.store && req.user.store._id) ? req.user.store._id.toString() : (req.user.store ? req.user.store.toString() : undefined);
      if (!userStoreId || product.storeId.toString() !== userStoreId) {
        return res.status(403).json({ message: 'Accès refusé à ce produit' });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Produit mis à jour avec succès',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Un produit avec ce SKU existe déjà dans cette entreprise'
      });
    }
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   DELETE /api/inventory/products/:id
// @desc    Supprimer un produit
// @access  Private
router.delete('/products/:id', authenticate, allowManageInventory, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        message: 'Produit non trouvé'
      });
    }

    // Vérifier l'accès
    if (req.user.role === 'company_admin' && product.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à ce produit'
      });
    }

    if (['store_manager', 'employee'].includes(req.user.role) && product.storeId.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à ce produit'
      });
    }

    // Marquer comme inactif au lieu de supprimer
    product.isActive = false;
    product.updatedBy = req.user._id;
    await product.save();

    res.json({
      message: 'Produit désactivé avec succès'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   PUT /api/inventory/products/:id/stock
// @desc    Mettre à jour le stock d'un produit
// @access  Private
router.put('/products/:id/stock', authenticate, allowManageInventory, stockUpdateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { quantity, operation, reason } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        message: 'Produit non trouvé'
      });
    }

    // Vérifier l'accès
    if (req.user.role === 'company_admin' && product.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à ce produit'
      });
    }

    if (['store_manager', 'employee'].includes(req.user.role) && product.storeId.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({
        message: 'Accès refusé à ce produit'
      });
    }

    const oldStock = product.inventory.currentStock;
    await product.updateStock(quantity, operation);

    // Log de l'opération (optionnel - pourrait être stocké dans une collection séparée)
    console.log(`Stock updated for product ${product.name}: ${oldStock} -> ${product.inventory.currentStock} (${operation} ${quantity}) by ${req.user.fullName}. Reason: ${reason || 'N/A'}`);

    res.json({
      message: 'Stock mis à jour avec succès',
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        oldStock,
        newStock: product.inventory.currentStock,
        operation,
        quantity,
        reason
      }
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du stock',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/inventory/categories
// @desc    Obtenir toutes les catégories
// @access  Private
router.get('/categories', authenticate, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'super_admin') {
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
    } else {
      query.companyId = (req.user.company && req.user.company._id) ? req.user.company._id : req.user.company;
    }

    const categories = await Category.find(query)
      .populate('parentId', 'name')
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      categories,
      count: categories.length
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des catégories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   POST /api/inventory/categories
// @desc    Créer une nouvelle catégorie
// @access  Private
router.post('/categories', authenticate, checkPermission('canManageInventory'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('parentId').optional().isMongoId().withMessage('ID parent invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, description, parentId, sortOrder, icon, color } = req.body;

    const userCompanyId = (req.user.company && req.user.company._id) ? req.user.company._id : req.user.company;
    const category = new Category({
      name,
      description,
      parentId,
      companyId: userCompanyId,
      sortOrder: sortOrder || 0,
      icon,
      color: color || '#1D4ED8'
    });

    await category.save();

    res.status(201).json({
      message: 'Catégorie créée avec succès',
      category
    });

  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Une catégorie avec ce nom existe déjà dans cette entreprise'
      });
    }
    res.status(500).json({
      message: 'Erreur lors de la création de la catégorie',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/inventory/stats
// @desc    Obtenir les statistiques d'inventaire
// @access  Private
router.get('/stats', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    let matchStage = { isActive: true };

    // Filtrer selon le rôle
    if (req.user.role === 'company_admin') {
      matchStage.companyId = (req.user.company && req.user.company._id) ? req.user.company._id : req.user.company;
      if (req.query.storeId) {
        matchStage.storeId = req.query.storeId;
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      matchStage.storeId = (req.user.store && req.user.store._id) ? req.user.store._id : req.user.store;
    }

    const stats = await Product.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$inventory.currentStock' },
          totalValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } },
          lowStockProducts: {
            $sum: {
              $cond: [
                { $lte: ['$inventory.currentStock', '$inventory.minStock'] },
                1,
                0
              ]
            }
          },
          outOfStockProducts: {
            $sum: {
              $cond: [
                { $eq: ['$inventory.currentStock', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Statistiques par catégorie
    const categoryStats = await Product.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalStock: { $sum: '$inventory.currentStock' },
          totalValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      summary: stats[0] || {
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0
      },
      byCategory: categoryStats
    });

  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/inventory/search
// @desc    Rechercher des produits
// @access  Private
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, categoryId, storeId } = req.query;

    let filters = {};

    // Filtrer selon le rôle
    if (req.user.role === 'company_admin') {
      filters.companyId = (req.user.company && req.user.company._id) ? req.user.company._id : req.user.company;
      if (storeId) {
        filters.storeId = storeId;
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      filters.storeId = (req.user.store && req.user.store._id) ? req.user.store._id : req.user.store;
    }

    if (categoryId) {
      filters.categoryId = categoryId;
    }

    const products = await Product.searchProducts(q, filters);

    res.json({
      products,
      count: products.length
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      message: 'Erreur lors de la recherche',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

module.exports = router;
