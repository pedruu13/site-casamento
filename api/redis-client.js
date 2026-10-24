const Redis = require('ioredis');

let redis = null;
function getRedis() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error("REDIS_URL não configurada.");
    redis = new Redis(redisUrl);
  }
  return redis;
}

// Lista de IPs bloqueados (vazia no momento)
const BLOCKED_IPS = [];

function isIpBlocked(ip) {
  if (!ip) return false;
  return BLOCKED_IPS.some(blocked => ip.includes(blocked));
}

module.exports = {
  getRedis,
  BLOCKED_IPS,
  isIpBlocked
};
