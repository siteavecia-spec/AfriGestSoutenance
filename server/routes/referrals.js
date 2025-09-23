const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ReferralCode = require('../models/ReferralCode');
const ReferralRequest = require('../models/ReferralRequest');
const ReferralReward = require('../models/ReferralReward');
const User = require('../models/User');
const Notification = require('../models/Notification');

function generateReferralCode(prefix = 'AFG') {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += charset[Math.floor(Math.random() * charset.length)];
  return `${prefix}-${code}`;
}

// GET /api/referrals/code - get or create current user's referral code (DG/PDG)
router.get('/code', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Only allow certain roles to have codes (dg/company_admin by spec)
    if (!['dg', 'company_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Accès refusé: rôle non éligible" });
    }

    let codeDoc = await ReferralCode.findOne({ userId, isActive: true });
    if (!codeDoc) {
      // create one if none exists
      let code;
      let exists = true;
      while (exists) {
        code = generateReferralCode('AFG');
        exists = await ReferralCode.findOne({ code });
      }
      codeDoc = await ReferralCode.create({ userId, code, isActive: true });
    }

    res.json({ success: true, code: codeDoc.code });
  } catch (err) {
    console.error('Error getting referral code', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/referrals/generate - regenerate (invalidate old and create new)
router.post('/generate', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    if (!['dg', 'company_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Accès refusé: rôle non éligible" });
    }

    await ReferralCode.updateMany({ userId, isActive: true }, { $set: { isActive: false } });

    let code;
    let exists = true;
    while (exists) {
      code = generateReferralCode('AFG');
      exists = await ReferralCode.findOne({ code });
    }
    const newDoc = await ReferralCode.create({ userId, code, isActive: true });

    res.json({ success: true, message: 'Nouveau code généré', code: newDoc.code });
  } catch (err) {
    console.error('Error generating referral code', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/referrals/requests - list referral requests (admin only)
router.get('/requests', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé. Super Admin requis.' });
    }

    const { status, page = 1, limit = 10, period, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // period filter: week/month/all OR explicit date range
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(endDate) } : {}),
      };
    } else if (period === 'week' || period === 'month') {
      const now = new Date();
      let from;
      if (period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        from = new Date(now.setHours(0, 0, 0, 0));
        from.setDate(diff);
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      dateFilter = { $gte: from };
    }
    if (Object.keys(dateFilter).length) {
      filter.createdAt = dateFilter;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      ReferralRequest.find(filter)
        .populate({ path: 'referralCodeId', populate: { path: 'userId', select: 'firstName lastName email role' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ReferralRequest.countDocuments(filter),
    ]);

    res.json({ success: true, data: items, pagination: { current: parseInt(page), pages: Math.ceil(total / parseInt(limit)), total, limit: parseInt(limit) } });
  } catch (err) {
    console.error('Error listing referral requests', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/referrals/validate/:id - validate a referral (admin)
router.post('/validate/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé. Super Admin requis.' });
    }

    const request = await ReferralRequest.findById(req.params.id).populate({ path: 'referralCodeId', populate: { path: 'userId' } });
    if (!request) return res.status(404).json({ success: false, message: 'Parrainage non trouvé' });

    request.status = 'approved';
    await request.save();

    // Notify the referrer that their referral was approved
    try {
      const referrer = request?.referralCodeId?.userId;
      if (referrer?._id) {
        await Notification.create({
          userId: referrer._id,
          message: `Un de vos parrainages a été validé pour ${request.prospectEmail || 'un prospect'}`,
          severity: 'success',
          meta: { referralRequestId: request._id, prospectEmail: request.prospectEmail },
        });
      }
    } catch (e) {
      console.warn('Notification validation parrainage - échec:', e?.message || e);
    }

    res.json({ success: true, message: 'Parrainage validé' });
  } catch (err) {
    console.error('Error validating referral request', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/referrals/stats - simple stats for ambassadors (self)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const code = await ReferralCode.findOne({ userId, isActive: true });
    const codeId = code?._id;

    const totalRequests = codeId ? await ReferralRequest.countDocuments({ referralCodeId: codeId }) : 0;
    const approved = codeId ? await ReferralRequest.countDocuments({ referralCodeId: codeId, status: 'approved' }) : 0;

    res.json({ success: true, data: { totalRequests, approved } });
  } catch (err) {
    console.error('Error getting referral stats', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/referrals/validate?code=AFG-XXXXXX - validate code existence (public)
router.get('/validate', async (req, res) => {
  try {
    const code = (req.query.code || '').toString().trim();
    if (!code) return res.status(400).json({ success: false, valid: false, message: 'Code requis' });
    const found = await ReferralCode.findOne({ code, isActive: true }).select('_id code');
    res.json({ success: true, valid: !!found });
  } catch (err) {
    console.error('Error validating referral code', err);
    res.status(500).json({ success: false, valid: false, message: 'Erreur serveur' });
  }
});

// GET /api/referrals/leaderboard?period=month&limit=10 - Top ambassadeurs
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const period = (req.query.period || 'month').toString();
    const limit = Math.min(parseInt((req.query.limit || '10').toString(), 10) || 10, 50);

    let startDate = null;
    const now = new Date();
    if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // lundi
      startDate = new Date(now.setHours(0, 0, 0, 0));
      startDate.setDate(diff);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } // 'all' => no startDate

    const matchStage = startDate ? { createdAt: { $gte: startDate } } : {};

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$referralCodeId',
          totalRequests: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          latestAt: { $max: '$createdAt' },
        }
      },
      { $sort: { approved: -1, totalRequests: -1, latestAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'referralcodes',
          localField: '_id',
          foreignField: '_id',
          as: 'codeDoc'
        }
      },
      { $unwind: { path: '$codeDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'codeDoc.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          referralCodeId: '$_id',
          totalRequests: 1,
          approved: 1,
          user: { _id: '$user._id', firstName: '$user.firstName', lastName: '$user.lastName', email: '$user.email' },
          code: '$codeDoc.code',
        }
      }
    ];

    const results = await ReferralRequest.aggregate(pipeline);
    res.json({ success: true, data: results, period, limit });
  } catch (err) {
    console.error('Error getting leaderboard', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
