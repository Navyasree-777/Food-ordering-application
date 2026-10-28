const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Please log in to continue.' });
  try {
    req.user = jwt.verify(match[1], process.env.JWT_SECRET);
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'Your session is invalid or expired. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' });
  return next();
}
module.exports = { requireAuth, requireAdmin };
