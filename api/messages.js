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

    // ROTA GET: Retorna a lista de mensagens
    if (req.method === 'GET') {
      const data = await client.get('messages_list');
      const messages = data ? JSON.parse(data) : [];
      return res.status(200).json({ messages });
    }

    // ROTA POST: Adiciona uma nova mensagem à lista
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      
      if (!body || !body.name || !body.text) {
        return res.status(400).json({ error: "Nome e mensagem são obrigatórios" });
      }

      const data = await client.get('messages_list');
      const messages = data ? JSON.parse(data) : [];

      const ip = clientIp || 'Desconhecido';
      const userAgent = req.headers['user-agent'] || 'Desconhecido';

      const newMessage = {
        id: Date.now().toString(),
        name: body.name.trim(),
        text: body.text.trim(),
        ip: ip,
        initial: body.name.trim().charAt(0).toUpperCase(),
        timestamp: new Date().toISOString()
      };
      
      messages.unshift(newMessage);
      await client.set('messages_list', JSON.stringify(messages));

      return res.status(200).json({ message: newMessage, messages });
    }

    return res.status(405).json({ error: "Método não permitido" });

  } catch (error) {
    console.error("Erro no Redis:", error);
    return res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
};
