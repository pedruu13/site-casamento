const { isIpBlocked } = require('./redis-client');

module.exports = async function handler(req, res) {
  const clientIp = req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.socket?.remoteAddress || '';

  if (isIpBlocked(clientIp)) {
    return res.status(200).json({ blocked: true });
  }

  return res.status(200).json({ blocked: false });
};
