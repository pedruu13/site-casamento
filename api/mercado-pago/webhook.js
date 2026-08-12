module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  console.log('Mercado Pago webhook:', {
    receivedAt: new Date().toISOString(),
    query: req.query,
    body: req.body
  });

  res.status(200).json({ ok: true });
};
