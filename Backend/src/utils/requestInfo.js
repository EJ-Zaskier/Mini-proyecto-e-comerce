const normalizeIp = (rawIp = '') => {
  if (!rawIp) return 'unknown';
  return rawIp.replace('::ffff:', '');
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return normalizeIp(forwardedFor.split(',')[0].trim());
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
};

const getUserAgent = (req) => req.headers['user-agent'] || 'unknown';

module.exports = {
  getClientIp,
  getUserAgent
};
