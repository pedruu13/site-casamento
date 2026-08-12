const { randomUUID } = require('node:crypto');

const gifts = require('../data/gifts.json');

function siteUrl(req) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      body = JSON.parse(body || '{}');
    }
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString('utf8') || '{}');
    }

    const { giftId, amount } = body;
    const gift = gifts.find((item) => item.active && item.id === giftId);

    if (!gift) {
      res.status(400).json({ error: 'Presente invalido ou indisponivel.' });
      return;
    }

    const requestedAmount = Number(amount);
    if (gift.allowCustomAmount && (!Number.isFinite(requestedAmount) || requestedAmount < gift.minimumPrice)) {
      res.status(400).json({ error: `O valor minimo para este presente e R$ ${gift.minimumPrice},00.` });
      return;
    }

    const unitPrice = gift.allowCustomAmount
      ? Math.round(requestedAmount * 100) / 100
      : gift.unitPrice;

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      res.status(500).json({ error: 'Configure MERCADO_PAGO_ACCESS_TOKEN antes de criar pagamentos.' });
      return;
    }

    const baseUrl = siteUrl(req);
    const externalReference = `luiza-luan-${gift.id}-${randomUUID()}`;
    const preference = {
      items: [
        {
          id: gift.id,
          title: gift.title,
          description: gift.description,
          quantity: 1,
          currency_id: gift.currencyId,
          unit_price: unitPrice
        }
      ],
      external_reference: externalReference,
      back_urls: {
        success: `${baseUrl}/index.html?payment=success`,
        failure: `${baseUrl}/index.html?payment=failure`,
        pending: `${baseUrl}/index.html?payment=pending`
      },
      ...(baseUrl.includes('localhost') ? {} : { auto_return: 'approved' }),
      notification_url: `${baseUrl}/api/mercado-pago/webhook`,
      statement_descriptor: 'LUIZA E LUAN'
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago preference error:', data);
      res.status(response.status).json({ error: 'Mercado Pago recusou a criacao do checkout.' });
      return;
    }

    res.status(200).json({
      preferenceId: data.id,
      checkoutUrl: data.init_point,
      sandboxCheckoutUrl: data.sandbox_init_point,
      externalReference
    });
  } catch (error) {
    console.error('create-preference internal error:', error);
    res.status(500).json({
      error: 'Erro interno ao criar checkout.',
      detail: error.message
    });
  }
};
