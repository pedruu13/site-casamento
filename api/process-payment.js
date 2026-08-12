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
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    if (Buffer.isBuffer(body)) body = JSON.parse(body.toString('utf8') || '{}');

    const { giftId, customAmount, formData } = body;
    const gift = gifts.find((item) => item.active && item.id === giftId);

    if (!gift) {
      res.status(400).json({ error: 'Presente invalido ou indisponivel.' });
      return;
    }

    const requestedAmount = Number(customAmount);
    let unitPrice = gift.unitPrice;

    if (gift.allowCustomAmount) {
      if (!Number.isFinite(requestedAmount) || requestedAmount < gift.minimumPrice) {
        res.status(400).json({ error: `O valor minimo para este presente e R$ ${gift.minimumPrice},00.` });
        return;
      }
      unitPrice = Math.round(requestedAmount * 100) / 100;
    }

    // Validate if formData amount matches unitPrice to prevent client tampering
    if (formData.transaction_amount !== unitPrice) {
       res.status(400).json({ error: 'O valor da transação não confere com o valor do presente.' });
       return;
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      res.status(500).json({ error: 'Configure MERCADO_PAGO_ACCESS_TOKEN antes de criar pagamentos.' });
      return;
    }

    const externalReference = `luiza-luan-${gift.id}-${randomUUID()}`;

    const paymentData = {
      ...formData,
      description: `Presente: ${gift.title}`,
      external_reference: externalReference,
      ...(siteUrl(req).includes('localhost') ? {} : { notification_url: `${siteUrl(req)}/api/mercado-pago/webhook` }),
      additional_info: {
        items: [
          {
            id: gift.id,
            title: gift.title,
            description: gift.description,
            quantity: 1,
            unit_price: unitPrice
          }
        ]
      }
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago payment error:', data);
      res.status(response.status).json({ error: 'O pagamento foi recusado ou falhou.', details: data });
      return;
    }

    // Retorna os dados do pagamento (status, qr_code do pix, etc)
    res.status(200).json({
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error) {
    console.error('process-payment internal error:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno ao processar o pagamento.' });
  }
};
