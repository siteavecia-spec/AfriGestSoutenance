const AuditLog = require('../models/AuditLog');

/**
 * Simple audit recording helper
 * @param {Object} params
 * @param {string} params.entityType
 * @param {string|ObjectId} params.entityId
 * @param {string} params.action
 * @param {Object} [params.changes]
 * @param {Object} [params.meta]
 * @param {Object} req Express request (to derive user/company/store)
 */
async function recordAudit({ entityType, entityId, action, changes, meta }, req) {
  try {
    const userId = req?.user?._id;
    const companyId = req?.user?.company?._id || req?.user?.company;
    const storeId = req?.user?.store?._id || req?.user?.store;
    await AuditLog.record({ entityType, entityId, action, userId, companyId, storeId, changes, meta });
  } catch (e) {
    // Do not crash business flow for audit failure
    console.error('Audit record error:', e?.message || e);
  }
}

module.exports = { recordAudit };
