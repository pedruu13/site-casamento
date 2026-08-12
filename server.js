const http = require('node:http');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ROOT = __dirname;

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');

  try {
    const content = fsSync.readFileSync(envPath, 'utf8');

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split('=');
      process.env[key.trim()] ||= valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const PRESENCES_PATH = path.join(ROOT, 'data', 'presences.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.md': 'text/markdown; charset=utf-8'
};

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function loadGifts() {
  const giftsPath = path.join(ROOT, 'data', 'gifts.json');
  const gifts = JSON.parse(await fs.readFile(giftsPath, 'utf8'));
  return gifts.filter((gift) => gift.active);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

async function loadPresences() {
  try {
    const contents = await fs.readFile(PRESENCES_PATH, 'utf8');
    const presences = JSON.parse(contents);
    return Array.isArray(presences) ? presences : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function savePresences(presences) {
  await fs.writeFile(PRESENCES_PATH, `${JSON.stringify(presences, null, 2)}\n`, 'utf8');
}

function publicFilePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const fileName = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
  const fullPath = path.resolve(ROOT, fileName);
  const allowedRoot = `${ROOT}${path.sep}`;

  if (fullPath !== ROOT && !fullPath.startsWith(allowedRoot)) {
    return null;
  }

  return fullPath;
}

async function serveStatic(req, res) {
  const filePath = publicFilePath(req.url);

  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream'
    });
    res.end(file);
  } catch (error) {
    res.writeHead(404);
    res.end('Not found');
  }
}

async function createPreference(req, res) {
  try {
    const { giftId, amount } = await readJsonBody(req);
    const gifts = await loadGifts();
    const gift = gifts.find((item) => item.id === giftId);

    if (!gift) {
      sendJson(res, 400, { error: 'Presente invalido ou indisponivel.' });
      return;
    }

    const requestedAmount = Number(amount);
    const unitPrice = gift.allowCustomAmount
      ? Number(requestedAmount.toFixed(2))
      : gift.unitPrice;

    if (gift.allowCustomAmount && (!Number.isFinite(requestedAmount) || requestedAmount < gift.minimumPrice)) {
      sendJson(res, 400, { error: `O valor minimo para este presente e R$ ${gift.minimumPrice},00.` });
      return;
    }

    if (!ACCESS_TOKEN) {
      sendJson(res, 500, {
        error: 'Configure MERCADO_PAGO_ACCESS_TOKEN antes de criar pagamentos.'
      });
      return;
    }

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
        success: `${SITE_URL}/index.html?payment=success`,
        failure: `${SITE_URL}/index.html?payment=failure`,
        pending: `${SITE_URL}/index.html?payment=pending`
      },
      ...(SITE_URL.includes('localhost') ? {} : { auto_return: 'approved' }),
      notification_url: `${SITE_URL}/api/mercado-pago/webhook`,
      statement_descriptor: 'LUIZA E LUAN'
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago preference error:', data);
      sendJson(res, response.status, {
        error: 'Mercado Pago recusou a criacao do checkout.'
      });
      return;
    }

    sendJson(res, 200, {
      preferenceId: data.id,
      checkoutUrl: data.init_point,
      sandboxCheckoutUrl: data.sandbox_init_point,
      externalReference
    });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Erro interno ao criar checkout.' });
  }
}

async function handleWebhook(req, res) {
  const body = await readJsonBody(req).catch(() => ({}));
  const event = {
    receivedAt: new Date().toISOString(),
    query: req.url.split('?')[1] || '',
    body
  };
  const logPath = path.join(ROOT, 'data', 'mercado-pago-webhooks.jsonl');

  await fs.appendFile(logPath, `${JSON.stringify(event)}\n`, 'utf8');
  sendJson(res, 200, { ok: true });
}

async function handlePresences(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store'
    });
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const presences = await loadPresences();
    sendJson(res, 200, { presences });
    return;
  }

  if (req.method === 'POST') {
    try {
      const { name } = await readJsonBody(req);
      const cleanName = String(name || '').trim();

      if (!cleanName) {
        sendJson(res, 400, { error: 'Nome da presenca e obrigatorio.' });
        return;
      }

      const presences = await loadPresences();
      const entry = {
        id: randomUUID(),
        name: cleanName,
        createdAt: new Date().toISOString()
      };

      presences.unshift(entry);
      await savePresences(presences);

      sendJson(res, 200, { presence: entry, presences });
      return;
    } catch (error) {
      console.error('Presence error:', error);
      sendJson(res, 500, { error: 'Erro interno ao salvar a presenca.' });
      return;
    }
  }

  res.writeHead(405, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end('Method not allowed');
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/presences')) {
    await handlePresences(req, res);
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/get-public-key')) {
    sendJson(res, 200, { publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/create-preference')) {
    await createPreference(req, res);
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/mercado-pago/webhook')) {
    await handleWebhook(req, res);
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/process-payment')) {
    const handler = require('./api/process-payment.js');
    req.body = await readJsonBody(req);
    res.status = (code) => {
      return {
        json: (data) => sendJson(res, code, data)
      };
    };
    await handler(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`Site Luiza & Luan em ${SITE_URL}`);
});
