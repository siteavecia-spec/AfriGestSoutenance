const express = require('express');
const router = express.Router();
const DemoRequest = require('../models/DemoRequest');
const { authenticate } = require('../middleware/auth');
const ReferralCode = require('../models/ReferralCode');
const ReferralRequest = require('../models/ReferralRequest');
const Notification = require('../models/Notification');

// @route   POST /api/demo-requests
// @desc    Créer une nouvelle demande de démo
// @access  Public
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      businessType,
      storeCount,
      message,
      referralCode
    } = req.body;

    // Validation des champs requis
    if (!firstName || !lastName || !email || !phone || !company || !businessType || !storeCount) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    // Vérifier si une demande existe déjà avec cet email
    const existingRequest = await DemoRequest.findOne({ email });
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Une demande de démo existe déjà avec cet email'
      });
    }

    // Créer la nouvelle demande
    const demoRequest = new DemoRequest({
      firstName,
      lastName,
      email,
      phone,
      company,
      businessType,
      storeCount,
      message: message || '',
      referralCode: referralCode?.trim() || undefined,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer')
    });

    await demoRequest.save();

    // Si un code parrain est fourni, tenter de l'enregistrer comme demande de parrainage
    if (referralCode && typeof referralCode === 'string') {
      const codeDoc = await ReferralCode.findOne({ code: referralCode.trim(), isActive: true });
      if (codeDoc) {
        try {
          await ReferralRequest.create({
            referralCodeId: codeDoc._id,
            prospectEmail: email,
            prospectPhone: phone,
            companyName: company,
            demoRequestId: demoRequest._id,
            status: 'pending',
          });
          // Notifier le parrain que son code a été utilisé
          try {
            await Notification.create({
              userId: codeDoc.userId,
              message: `Votre code parrain a été utilisé par ${email}`,
              severity: 'info',
              meta: { demoRequestId: demoRequest._id, referralCode: codeDoc.code },
            });
          } catch (e) {
            console.warn('Notification parrain usage code - échec:', e?.message || e);
          }
        } catch (e) {
          console.warn('Impossible de créer ReferralRequest:', e?.message || e);
        }
      }
    }

    // TODO: Envoyer une notification email à l'équipe commerciale
    // TODO: Envoyer un email de confirmation au demandeur

    res.status(201).json({
      success: true,
      message: 'Demande de démo envoyée avec succès',
      data: {
        id: demoRequest._id,
        fullName: demoRequest.fullName,
        company: demoRequest.company,
        status: demoRequest.status,
        resolutionDate: demoRequest.resolutionDate
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la demande de démo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi de la demande'
    });
  }
});

// @route   GET /api/demo-requests
// @desc    Récupérer toutes les demandes de démo (Super Admin uniquement)
// @access  Private (Super Admin)
router.get('/', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé. Super Admin requis.'
      });
    }

    const { status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Construire le filtre
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Construire l'ordre de tri
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculer la pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [demoRequests, total] = await Promise.all([
      DemoRequest.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo', 'firstName lastName email')
        .populate('notes.addedBy', 'firstName lastName'),
      DemoRequest.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: demoRequests,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des demandes de démo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des demandes'
    });
  }
});

// @route   GET /api/demo-requests/statistics
// @desc    Récupérer les statistiques des demandes de démo
// @access  Private (Super Admin)
router.get('/statistics', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé. Super Admin requis.'
      });
    }

    const statistics = await DemoRequest.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
});

// @route   GET /api/demo-requests/:id
// @desc    Récupérer une demande de démo spécifique
// @access  Private (Super Admin)
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé. Super Admin requis.'
      });
    }

    const demoRequest = await DemoRequest.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('notes.addedBy', 'firstName lastName');

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de démo non trouvée'
      });
    }

    res.json({
      success: true,
      data: demoRequest
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la demande de démo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de la demande'
    });
  }
});

// @route   PUT /api/demo-requests/:id/status
// @desc    Mettre à jour le statut d'une demande de démo
// @access  Private (Super Admin)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé. Super Admin requis.'
      });
    }

    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Le statut est requis'
      });
    }

    const demoRequest = await DemoRequest.findById(req.params.id);
    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de démo non trouvée'
      });
    }

    demoRequest.status = status;
    demoRequest.assignedTo = req.user._id;
    if (['demo_completed', 'converted', 'rejected'].includes(status)) {
      demoRequest.resolutionDate = new Date();
    } else {
      demoRequest.resolutionDate = undefined;
    }

    if (note) {
      demoRequest.addNote(note, req.user._id);
    }

    await demoRequest.save();

    res.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: demoRequest
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du statut'
    });
  }
});

// @route   POST /api/demo-requests/:id/notes
// @desc    Ajouter une note à une demande de démo
// @access  Private (Super Admin)
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé. Super Admin requis.'
      });
    }

    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'La note est requise'
      });
    }

    const demoRequest = await DemoRequest.findById(req.params.id);
    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de démo non trouvée'
      });
    }

    await demoRequest.addNote(note, req.user._id);

    res.json({
      success: true,
      message: 'Note ajoutée avec succès',
      data: demoRequest
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'ajout de la note'
    });
  }
});

module.exports = router;
