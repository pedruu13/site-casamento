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

// Lista de IPs bloqueados de acessar/confirmar/interagir
const BLOCKED_IPS = [
  '187.116.107.28'
];

function isIpBlocked(ip) {
  if (!ip) return false;
  return BLOCKED_IPS.some(blocked => ip.includes(blocked));
}

module.exports = {
  getRedis,
  BLOCKED_IPS,
  isIpBlocked
};
