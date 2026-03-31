const AuditLog = require('../models/AuditLog');
const { getClientIp, getUserAgent } = require('./requestInfo');

const logAudit = async ({
  req,
  user = null,
  action,
  resourceType = '',
  resourceId = '',
  details = {}
}) => {
  if (!action) return;

  await AuditLog.create({
    user: user?.id || user?._id || req?.user?.id || null,
    userEmail: user?.email || details?.email || '',
    action,
    resourceType,
    resourceId: resourceId ? String(resourceId) : '',
    details,
    ip: req ? getClientIp(req) : 'unknown',
    userAgent: req ? getUserAgent(req) : 'unknown'
  });
};

module.exports = {
  logAudit
};
