const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Store = require('../models/Store');
const { authenticate, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/accounting/revenue
// @desc    Obtenir les revenus selon la période
// @access  Private
router.get('/revenue', authenticate, checkPermission('canViewAccounting'), async (req, res) => {
  try {
    let matchStage = { status: 'completed' };

    // Filtrer selon le rôle
    if (['company_admin', 'dg', 'accountant'].includes(req.user.role)) {
      matchStage.companyId = req.user.company?._id || req.user.company;
      if (req.query.storeId) {
        matchStage.storeId = req.query.storeId;
      }
    } else if (['store_manager', 'store_accountant', 'employee'].includes(req.user.role)) {
      matchStage.storeId = req.user.store?._id || req.user.store;
    }

    // Filtres de date
    const { startDate, endDate, period } = req.query;
    
    if (startDate && endDate) {
      matchStage.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          weekStart.setHours(0, 0, 0, 0);
          matchStage.saleDate = { $gte: weekStart };
          break;
        case 'month':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1)
          };
          break;
        case 'year':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), 0, 1)
          };
          break;
      }
    }

    // Revenus totaux
    const revenueStats = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalSales: { $sum: 1 },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          totalTax: { $sum: '$totalTax' },
          totalDiscount: { $sum: '$totalDiscount' },
          averageSaleAmount: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Revenus par méthode de paiement
    const paymentMethodStats = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$payment.method',
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Revenus par boutique (si company_admin)
    let storeStats = [];
    if (['company_admin', 'dg', 'accountant'].includes(req.user.role)) {
      storeStats = await Sale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$storeId',
            revenue: { $sum: '$totalAmount' },
            sales: { $sum: 1 }
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

    res.json({
      summary: revenueStats[0] || {
        totalRevenue: 0,
        totalSales: 0,
        totalItems: 0,
        totalTax: 0,
        totalDiscount: 0,
        averageSaleAmount: 0
      },
      byPaymentMethod: paymentMethodStats,
      byStore: storeStats
    });

  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des revenus',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/accounting/expenses
// @desc    Obtenir les dépenses (placeholder pour future implémentation)
// @access  Private
router.get('/expenses', authenticate, checkPermission('canViewAccounting'), async (req, res) => {
  try {
    // Pour l'instant, retourner des données de test
    // Dans une implémentation complète, ceci viendrait d'une collection Expense
    res.json({
      message: 'Module de gestion des dépenses à implémenter',
      expenses: [],
      totalExpenses: 0
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des dépenses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/accounting/profit-loss
// @desc    Obtenir le compte de résultat
// @access  Private
router.get('/profit-loss', authenticate, checkPermission('canViewAccounting'), async (req, res) => {
  try {
    let matchStage = { status: 'completed' };

    // Filtrer selon le rôle
    if (['company_admin', 'dg', 'accountant'].includes(req.user.role)) {
      matchStage.companyId = req.user.company?._id || req.user.company;
      if (req.query.storeId) {
        matchStage.storeId = req.query.storeId;
      }
    } else if (['store_manager', 'store_accountant', 'employee'].includes(req.user.role)) {
      matchStage.storeId = req.user.store?._id || req.user.store;
    }

    // Filtres de date
    const { startDate, endDate, period } = req.query;
    
    if (startDate && endDate) {
      matchStage.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          weekStart.setHours(0, 0, 0, 0);
          matchStage.saleDate = { $gte: weekStart };
          break;
        case 'month':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1)
          };
          break;
        case 'year':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), 0, 1)
          };
          break;
      }
    }

    // Calculer les revenus
    const revenueStats = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTax: { $sum: '$totalTax' },
          totalDiscount: { $sum: '$totalDiscount' }
        }
      }
    ]);

    // Calculer le coût des marchandises vendues (COGS)
    const cogsStats = await Sale.aggregate([
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
        $group: {
          _id: null,
          totalCOGS: { 
            $sum: { 
              $multiply: [
                '$items.quantity', 
                '$product.pricing.costPrice'
              ] 
            } 
          }
        }
      }
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, totalTax: 0, totalDiscount: 0 };
    const cogs = cogsStats[0] || { totalCOGS: 0 };

    // Calculer les marges
    const grossProfit = revenue.totalRevenue - cogs.totalCOGS;
    const grossMargin = revenue.totalRevenue > 0 ? (grossProfit / revenue.totalRevenue) * 100 : 0;

    // Pour l'instant, les dépenses sont à 0 (à implémenter)
    const totalExpenses = 0;
    const netProfit = grossProfit - totalExpenses;
    const netMargin = revenue.totalRevenue > 0 ? (netProfit / revenue.totalRevenue) * 100 : 0;

    res.json({
      period: {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        period: req.query.period
      },
      revenue: {
        totalRevenue: revenue.totalRevenue,
        totalTax: revenue.totalTax,
        totalDiscount: revenue.totalDiscount,
        netRevenue: revenue.totalRevenue - revenue.totalDiscount
      },
      costs: {
        costOfGoodsSold: cogs.totalCOGS,
        totalExpenses: totalExpenses,
        totalCosts: cogs.totalCOGS + totalExpenses
      },
      profit: {
        grossProfit: grossProfit,
        grossMargin: grossMargin,
        netProfit: netProfit,
        netMargin: netMargin
      }
    });

  } catch (error) {
    console.error('Get profit-loss error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération du compte de résultat',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/accounting/balance-sheet
// @desc    Obtenir le bilan (placeholder pour future implémentation)
// @access  Private
router.get('/balance-sheet', authenticate, checkPermission('canViewAccounting'), async (req, res) => {
  try {
    // Pour l'instant, retourner des données de test
    // Dans une implémentation complète, ceci viendrait d'une collection BalanceSheet
    res.json({
      message: 'Module de bilan à implémenter',
      assets: {
        current: 0,
        fixed: 0,
        total: 0
      },
      liabilities: {
        current: 0,
        longTerm: 0,
        total: 0
      },
      equity: {
        total: 0
      }
    });

  } catch (error) {
    console.error('Get balance sheet error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération du bilan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/accounting/cash-flow
// @desc    Obtenir le tableau de flux de trésorerie
// @access  Private
router.get('/cash-flow', authenticate, checkPermission('canViewAccounting'), async (req, res) => {
  try {
    let matchStage = { status: 'completed' };

    // Filtrer selon le rôle
    if (['company_admin', 'dg'].includes(req.user.role)) {
      matchStage.companyId = req.user.company?._id || req.user.company;
      if (req.query.storeId) {
        matchStage.storeId = req.query.storeId;
      }
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      matchStage.storeId = req.user.store?._id || req.user.store;
    }

    // Filtres de date
    const { startDate, endDate, period } = req.query;
    
    if (startDate && endDate) {
      matchStage.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          weekStart.setHours(0, 0, 0, 0);
          matchStage.saleDate = { $gte: weekStart };
          break;
        case 'month':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1)
          };
          break;
        case 'year':
          matchStage.saleDate = {
            $gte: new Date(now.getFullYear(), 0, 1)
          };
          break;
      }
    }

    // Flux de trésorerie par méthode de paiement
    const cashFlowByMethod = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$payment.method',
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Flux de trésorerie quotidien (pour les 30 derniers jours)
    const dailyCashFlow = await Sale.aggregate([
      { 
        $match: { 
          ...matchStage,
          saleDate: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
          } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' },
            day: { $dayOfMonth: '$saleDate' }
          },
          cashIn: { $sum: '$totalAmount' },
          sales: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Calculer les totaux
    const totalCashIn = cashFlowByMethod.reduce((sum, method) => sum + method.amount, 0);
    const totalCashOut = 0; // À implémenter avec les dépenses

    res.json({
      period: {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        period: req.query.period
      },
      summary: {
        cashIn: totalCashIn,
        cashOut: totalCashOut,
        netCashFlow: totalCashIn - totalCashOut
      },
      byPaymentMethod: cashFlowByMethod,
      dailyFlow: dailyCashFlow
    });

  } catch (error) {
    console.error('Get cash flow error:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération du flux de trésorerie',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/accounting/reports
// @desc    Obtenir les rapports comptables
// @access  Private
router.get('/reports', authenticate, checkPermission('canViewReports'), async (req, res) => {
  try {
    const { type, startDate, endDate, storeId } = req.query;

    let matchStage = { status: 'completed' };

    // Filtrer selon le rôle
    if (['company_admin', 'dg', 'accountant'].includes(req.user.role)) {
      matchStage.companyId = req.user.company?._id || req.user.company;
      if (storeId) {
        matchStage.storeId = storeId;
      }
    } else if (['store_manager', 'store_accountant', 'employee'].includes(req.user.role)) {
      matchStage.storeId = req.user.store?._id || req.user.store;
    }

    // Filtres de date
    if (startDate && endDate) {
      matchStage.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let report = {};

    switch (type) {
      case 'sales':
        report = await Sale.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalSales: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' },
              totalItems: { $sum: { $sum: '$items.quantity' } },
              averageSaleAmount: { $avg: '$totalAmount' }
            }
          }
        ]);
        break;

      case 'products':
        report = await Sale.aggregate([
          { $match: matchStage },
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
          { $limit: 50 }
        ]);
        break;

      case 'customers':
        report = await Sale.aggregate([
          { $match: { ...matchStage, customerId: { $exists: true } } },
          {
            $group: {
              _id: '$customerId',
              totalPurchases: { $sum: 1 },
              totalSpent: { $sum: '$totalAmount' },
              averagePurchase: { $avg: '$totalAmount' }
            }
          },
          { $sort: { totalSpent: -1 } },
          { $limit: 50 }
        ]);
        break;

      default:
        return res.status(400).json({
          message: 'Type de rapport invalide'
        });
    }

    res.json({
      type,
      period: { startDate, endDate },
      data: report
    });

  } catch (error) {
    console.error('Get accounting reports error:', error);
    res.status(500).json({
      message: 'Erreur lors de la génération du rapport',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

module.exports = router;
