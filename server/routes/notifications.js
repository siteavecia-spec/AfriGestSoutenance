const express = require('express');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
// List notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    const filter = { userId: req.user._id };
    if (unreadOnly) filter.read = false;

    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);

    res.json({
      notifications: items,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des notifications' });
  }
});

// POST /api/notifications
// Create a notification for current user (optional meta)
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, severity = 'info', meta, companyId, storeId } = req.body || {};
    if (!message) return res.status(400).json({ message: 'message requis' });

    const notif = await Notification.create({
      userId: req.user._id,
      companyId: companyId || req.user.company?._id || req.user.company,
      storeId: storeId || req.user.store?._id || req.user.store,
      message,
      severity,
      meta,
    });

    res.status(201).json({ notification: notif });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la notification' });
  }
});

// PUT /api/notifications/:id/read
// Mark a notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée' });
    res.json({ notification: notif });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la notification' });
  }
});

// PUT /api/notifications/read-all
// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    res.json({ message: 'OK' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Erreur lors du marquage des notifications' });
  }
});

module.exports = router;
