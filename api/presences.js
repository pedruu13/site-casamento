const { getRedis, isIpBlocked } = require('./redis-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.socket?.remoteAddress || '';

  // Bloqueio de IP indesejado
  if (isIpBlocked(clientIp)) {
    return res.status(403).json({ error: "Acesso indisponível." });
  }

  try {
    const client = getRedis();

    // ROTA GET: Retorna a lista de confirmados
    if (req.method === 'GET') {
      const data = await client.get('presences_list');
      const presences = data ? JSON.parse(data) : [];
      
      const publicPresences = presences.map(p => ({
         name: p.name,
         timestamp: p.timestamp
      }));
      
      return res.status(200).json({ presences: publicPresences });
    }

    // ROTA POST: Adiciona um novo nome à lista
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      
      if (!body || !body.name) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      const data = await client.get('presences_list');
      const presences = data ? JSON.parse(data) : [];

      const ip = clientIp || 'Desconhecido';
      const userAgent = req.headers['user-agent'] || 'Desconhecido';

      const newPresence = {
        id: Date.now().toString(),
        name: body.name.trim(),
        phone: body.phone ? body.phone.trim() : 'Sem telefone',
        ip: ip,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      };
      
      presences.unshift(newPresence);
      await client.set('presences_list', JSON.stringify(presences));

      return res.status(200).json({ presence: newPresence, presences: [] });
    }

    return res.status(405).json({ error: "Método não permitido" });

  } catch (error) {
    console.error("Erro no Redis:", error);
    return res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
};
