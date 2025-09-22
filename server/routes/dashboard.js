const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const Company = require('../models/Company');
const { authenticate, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Obtenir les données du tableau de bord selon le rôle
// @access  Private
router.get('/overview', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    let matchStage = { status: 'completed' };
    let storeMatchStage = {};
    let userMatchStage = {};
    let productMatchStage = { isActive: true };

    // Filtrer selon le rôle
    if (req.user.role === 'super_admin') {
      // Super admin peut voir toutes les données
      if (req.query.companyId) {
        matchStage.companyId = req.query.companyId;
        storeMatchStage.companyId = req.query.companyId;
        userMatchStage.companyId = req.query.companyId;
        productMatchStage.companyId = req.query.companyId;
      }
    } else if (req.user.role === 'company_admin') {
      // Company admin peut voir les données de son entreprise
      matchStage.companyId = req.user.companyId;
      storeMatchStage.companyId = req.user.companyId;
      userMatchStage.companyId = req.user.companyId;
      productMatchStage.companyId = req.user.companyId;
      
      if (req.query.storeId) {
        matchStage.storeId = req.query.storeId;
        userMatchStage.storeId = req.query.storeId;
        productMatchStage.storeId = req.query.storeId;
      }
    } else {
      // Store manager et employee ne peuvent voir que les données de leur boutique
      matchStage.storeId = req.user.storeId;
      userMatchStage.storeId = req.user.storeId;
      productMatchStage.storeId = req.user.storeId;
    }

    // Statistiques de vente pour différentes périodes
    const [todayStats, weekStats, monthStats, yearStats] = await Promise.all([
      Sale.aggregate([
        { $match: { ...matchStage, saleDate: { $gte: today } } },
        {
          $group: {
            _id: null,
            sales: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            items: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]),
      Sale.aggregate([
        { $match: { ...matchStage, saleDate: { $gte: thisWeek } } },
        {
          $group: {
            _id: null,
            sales: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            items: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]),
      Sale.aggregate([
        { $match: { ...matchStage, saleDate: { $gte: thisMonth } } },
        {
          $group: {
            _id: null,
            sales: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            items: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]),
      Sale.aggregate([
        { $match: { ...matchStage, saleDate: { $gte: thisYear } } },
        {
          $group: {
            _id: null,
            sales: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            items: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ])
    ]);

    // Statistiques générales
    const [totalStores, totalUsers, totalProducts, lowStockProducts] = await Promise.all([
      Store.countDocuments(storeMatchStage),
      User.countDocuments({ ...userMatchStage, isActive: true }),
      Product.countDocuments(productMatchStage),
      Product.countDocuments({
        ...productMatchStage,
        $expr: { $lte: ['$inventory.currentStock', '$inventory.minStock'] }
      })
    ]);

    // Top produits vendus (30 derniers jours)
    const topProducts = await Sale.aggregate([
      {
        $match: {
          ...matchStage,
          saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          productSku: { $first: '$items.productSku' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    // Ventes récentes
    const recentSales = await Sale.find(matchStage)
      .populate('storeId', 'name code')
      .populate('customerId', 'firstName lastName')
      .populate('cashierId', 'firstName lastName')
      .sort({ saleDate: -1 })
      .limit(10)
      .select('saleNumber totalAmount saleDate payment.method customerId cashierId storeId');

    // Tendances des ventes (7 derniers jours)
    const salesTrend = await Sale.aggregate([
      {
        $match: {
          ...matchStage,
          saleDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' },
            day: { $dayOfMonth: '$saleDate' }
          },
          sales: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Méthodes de paiement
    const paymentMethods = await Sale.aggregate([
      { $match: { ...matchStage, saleDate: { $gte: thisMonth } } },
      {
        $group: {
          _id: '$payment.method',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    res.json({
      period: {
        today: todayStats[0] || { sales: 0, revenue: 0, items: 0 },
        week: weekStats[0] || { sales: 0, revenue: 0, items: 0 },
        month: monthStats[0] || { sales: 0, revenue: 0, items: 0 },
        year: yearStats[0] || { sales: 0, revenue: 0, items: 0 }
      },
      summary: {
        totalStores,
        totalUsers,
        totalProducts,
        lowStockProducts
      },
      topProducts,
      recentSales,
      salesTrend,
      paymentMethods
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des données du tableau de bord',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/dashboard/stats
// @desc    Statistiques tableau de bord (protégées par permission de rapports)
// @access  Private
router.get('/stats', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const match = { status: 'completed' };
    if (req.user.role === 'company_admin') {
      match.companyId = req.user.company?._id || req.user.company;
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      match.storeId = req.user.store?._id || req.user.store;
    }

    const [summary] = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalItems: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    res.json({ success: true, stats: summary || { totalSales: 0, totalRevenue: 0, totalItems: 0 } });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Obtenir les analyses détaillées
// @access  Private
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { period = 'month', storeId } = req.query;
    
    let matchStage = { status: 'completed' };
    let dateFilter = {};

    // Filtrer selon le rôle
    if (req.user.role === 'company_admin') {
      matchStage.companyId = req.user.companyId;
      if (storeId) {
        matchStage.storeId = storeId;
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      matchStage.storeId = req.user.storeId;
    }

    // Filtre de date selon la période
    const now = new Date();
    switch (period) {
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        dateFilter = { $gte: weekStart };
        break;
      case 'month':
        dateFilter = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateFilter = { $gte: quarterStart };
        break;
      case 'year':
        dateFilter = { $gte: new Date(now.getFullYear(), 0, 1) };
        break;
      default:
        dateFilter = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    }

    matchStage.saleDate = dateFilter;

    // Analyses des ventes
    const salesAnalytics = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          averageSaleAmount: { $avg: '$totalAmount' },
          totalTax: { $sum: '$totalTax' },
          totalDiscount: { $sum: '$totalDiscount' }
        }
      }
    ]);

    // Analyses par boutique (si company_admin)
    let storeAnalytics = [];
    if (req.user.role === 'company_admin') {
      storeAnalytics = await Sale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$storeId',
            sales: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            items: { $sum: { $sum: '$items.quantity' } }
          }
        },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: '_id',
            as: 'store'
          }
        },
        { $unwind: '$store' },
        { $sort: { revenue: -1 } }
      ]);
    }

    // Analyses par catégorie de produits
    const categoryAnalytics = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Analyses par heure de la journée
    const hourlyAnalytics = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: '$saleDate' },
          sales: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Analyses par jour de la semaine
    const dailyAnalytics = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dayOfWeek: '$saleDate' },
          sales: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      period,
      sales: salesAnalytics[0] || {
        totalSales: 0,
        totalRevenue: 0,
        totalItems: 0,
        averageSaleAmount: 0,
        totalTax: 0,
        totalDiscount: 0
      },
      byStore: storeAnalytics,
      byCategory: categoryAnalytics,
      byHour: hourlyAnalytics,
      byDay: dailyAnalytics
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des analyses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/dashboard/alerts
// @desc    Obtenir les alertes et notifications
// @access  Private
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const alerts = [];

    // Alertes de stock faible
    let productMatchStage = { isActive: true };
    if (req.user.role === 'company_admin') {
      productMatchStage.companyId = req.user.companyId;
      if (req.query.storeId) {
        productMatchStage.storeId = req.query.storeId;
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      productMatchStage.storeId = req.user.storeId;
    }

    const lowStockProducts = await Product.find({
      ...productMatchStage,
      $expr: { $lte: ['$inventory.currentStock', '$inventory.minStock'] }
    }).select('name sku inventory.currentStock inventory.minStock').limit(10);

    if (lowStockProducts.length > 0) {
      alerts.push({
        type: 'warning',
        category: 'inventory',
        title: 'Stock faible',
        message: `${lowStockProducts.length} produit(s) ont un stock faible`,
        count: lowStockProducts.length,
        data: lowStockProducts
      });
    }

    // Alertes de produits en rupture de stock
    const outOfStockProducts = await Product.find({
      ...productMatchStage,
      'inventory.currentStock': 0
    }).select('name sku').limit(10);

    if (outOfStockProducts.length > 0) {
      alerts.push({
        type: 'error',
        category: 'inventory',
        title: 'Rupture de stock',
        message: `${outOfStockProducts.length} produit(s) sont en rupture de stock`,
        count: outOfStockProducts.length,
        data: outOfStockProducts
      });
    }

    // Alertes de ventes (si aucune vente aujourd'hui)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let salesMatchStage = { 
      status: 'completed',
      saleDate: { $gte: today }
    };
    
    if (req.user.role === 'company_admin') {
      salesMatchStage.companyId = req.user.companyId;
      if (req.query.storeId) {
        salesMatchStage.storeId = req.query.storeId;
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      salesMatchStage.storeId = req.user.storeId;
    }

    const todaySales = await Sale.countDocuments(salesMatchStage);
    
    if (todaySales === 0) {
      alerts.push({
        type: 'info',
        category: 'sales',
        title: 'Aucune vente aujourd\'hui',
        message: 'Aucune vente n\'a été enregistrée aujourd\'hui',
        count: 0
      });
    }

    // Alertes d'utilisateurs inactifs (pour les admins)
    if (['super_admin', 'company_admin'].includes(req.user.role)) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      let userMatchStage = {
        isActive: true,
        lastLogin: { $lt: thirtyDaysAgo }
      };
      
      if (req.user.role === 'company_admin') {
        userMatchStage.companyId = req.user.companyId;
      }

      const inactiveUsers = await User.countDocuments(userMatchStage);
      
      if (inactiveUsers > 0) {
        alerts.push({
          type: 'warning',
          category: 'users',
          title: 'Utilisateurs inactifs',
          message: `${inactiveUsers} utilisateur(s) n'ont pas connecté depuis 30 jours`,
          count: inactiveUsers
        });
      }
    }

    res.json({
      alerts,
      total: alerts.length
    });

  } catch (error) {
    console.error('Get dashboard alerts error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des alertes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

module.exports = router;
 
// NOTE: Keep exports at the end – adding global KPIs endpoint above the export

// @route   GET /api/dashboard/global
// @desc    KPIs globaux (plateforme) réservés au super admin
// @access  Private (super_admin uniquement)
router.get('/global', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Accès réservé au super admin' });
    }

    // Déterminer la période demandée
    const { period = 'month' } = req.query;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let currentStart;
    switch (period) {
      case 'week':
        currentStart = startOfWeek; break;
      case 'quarter':
        currentStart = startOfQuarter; break;
      case 'year':
        currentStart = startOfYear; break;
      case 'month':
      default:
        currentStart = startOfMonth; break;
    }

    // Période précédente pour calcul des croissances
    let previousStart, previousEnd = new Date(currentStart);
    if (period === 'week') {
      previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'quarter') {
      previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 3);
    } else if (period === 'year') {
      previousStart = new Date(currentStart);
      previousStart.setFullYear(previousStart.getFullYear() - 1);
    } else { // month
      previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);
    }

    const [totalCompanies, activeCompanies, totalUsers, totalStores, salesAgg] = await Promise.all([
      Company.countDocuments({}),
      Company.countDocuments({ status: 'active' }),
      User.countDocuments({ isActive: true }),
      Store.countDocuments({ isActive: true }),
      Sale.aggregate([
        { $match: { status: 'completed', saleDate: { $gte: currentStart } } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);

    const salesTotals = salesAgg[0] || { totalSales: 0, totalRevenue: 0 };

    // Top entreprises par chiffre d'affaires (revenu), avec #stores et #users
    const topPerformingCompaniesAgg = await Sale.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$companyId',
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company'
        }
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: 'companyId',
          as: 'stores'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'company',
          as: 'users'
        }
      },
      {
        $project: {
          _id: 0,
          companyId: '$_id',
          name: { $ifNull: ['$company.name', 'Entreprise'] },
          revenue: 1,
          stores: { $size: '$stores' },
          users: { $size: '$users' }
        }
      }
    ]);

    const totalRevenue = salesTotals.totalRevenue || 0;
    const averageRevenuePerCompany = totalCompanies > 0 ? totalRevenue / totalCompanies : 0;

    // Placeholders simples pour croissance mensuelle (à raffiner ultérieurement)
    // Calcul des croissances vs période précédente
    const [companiesPrev, usersPrev, salesPrevAgg] = await Promise.all([
      Company.countDocuments({ createdAt: { $gte: previousStart, $lt: previousEnd } }),
      User.countDocuments({ createdAt: { $gte: previousStart, $lt: previousEnd } }),
      Sale.aggregate([
        { $match: { status: 'completed', saleDate: { $gte: previousStart, $lt: previousEnd } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ])
    ]);

    const [companiesCurrent, usersCurrent, revenuePrev] = await Promise.all([
      Company.countDocuments({ createdAt: { $gte: currentStart } }),
      User.countDocuments({ createdAt: { $gte: currentStart } }),
      Promise.resolve((salesPrevAgg[0]?.totalRevenue) || 0)
    ]);

    const pct = (cur, prev) => {
      if (!prev) return cur > 0 ? 100 : 0;
      return Number((((cur - prev) / prev) * 100).toFixed(1));
    };

    const monthlyGrowth = {
      companies: pct(companiesCurrent, companiesPrev),
      users: pct(usersCurrent, usersPrev),
      revenue: pct(totalRevenue, revenuePrev)
    };

    return res.json({
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalStores,
      totalSales: salesTotals.totalSales || 0,
      totalRevenue,
      averageRevenuePerCompany,
      topPerformingCompanies: topPerformingCompaniesAgg,
      monthlyGrowth
    });
  } catch (error) {
    console.error('Get global KPIs error:', error);
    return res.status(500).json({
      message: 'Erreur lors de la récupération des KPIs globaux',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});
