const express = require('express');
const Company = require('../models/Company');
const Sale = require('../models/Sale');

const router = express.Router();

// Simple in-memory cache
let cache = {
  partners: { data: null, expiresAt: 0 },
};

// GET /api/public/landing/partners
// Returns up to Top 5 public companies for landing page (name, logoUrl, websiteUrl)
router.get('/landing/partners', async (req, res) => {
  try {
    const now = Date.now();
    const ttlMs = 10 * 60 * 1000; // 10 minutes

    if (cache.partners.data && cache.partners.expiresAt > now) {
      return res.json({ partners: cache.partners.data, cached: true });
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days

    // Aggregate top companies by revenue (last 30d)
    const agg = await Sale.aggregate([
      { $match: { status: 'completed', saleDate: { $gte: since } } },
      { $group: { _id: '$companyId', totalRevenue: { $sum: '$totalAmount' }, totalSales: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    // Fetch company details for these
    const companyIds = agg.map(a => a._id).filter(Boolean);
    const companies = await Company.find({ _id: { $in: companyIds }, status: 'active', 'settings.isPublicOnLanding': true })
      .select('name settings.branding.logo settings.branding.websiteUrl')
      .lean();

    // Merge revenue with company info and filter those with a logo present
    const partnersByAgg = agg
      .map(a => {
        const c = companies.find(x => String(x._id) === String(a._id));
        if (!c) return null;
        const logoUrl = c.settings?.branding?.logo;
        const websiteUrl = c.settings?.branding?.websiteUrl;
        if (!logoUrl) return null; // require logo to display on landing
        return { id: String(c._id), name: c.name, logoUrl, websiteUrl: websiteUrl || null, totalRevenue: a.totalRevenue };
      })
      .filter(Boolean)
      .slice(0, 5);

    let partners = partnersByAgg;

    // Fallback: if less than 5, fill with active companies having a logo, sorted by totalRevenue (stats) or recent
    if (partners.length < 5) {
      const excludeIds = new Set(partners.map(p => p.id));
      const fillers = await Company.find({ status: 'active', 'settings.isPublicOnLanding': true, 'settings.branding.logo': { $exists: true, $ne: '' } })
        .select('name settings.branding.logo settings.branding.websiteUrl stats.totalRevenue createdAt')
        .sort({ 'stats.totalRevenue': -1, createdAt: -1 })
        .limit(10)
        .lean();
      for (const f of fillers) {
        const id = String(f._id);
        if (excludeIds.has(id)) continue;
        partners.push({ id, name: f.name, logoUrl: f.settings?.branding?.logo, websiteUrl: f.settings?.branding?.websiteUrl || null });
        if (partners.length >= 5) break;
      }
    }

    cache.partners = { data: partners, expiresAt: now + ttlMs };

    res.json({ partners, cached: false });
  } catch (error) {
    console.error('Public partners error:', error);
    res.status(500).json({ message: 'Erreur lors du chargement des partenaires' });
  }
});

module.exports = router;
