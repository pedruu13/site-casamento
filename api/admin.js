const { getRedis, isIpBlocked, BLOCKED_IPS } = require('./redis-client');

module.exports = async function handler(req, res) {
  // Senha simples por query string para acesso
  const token = req.query.senha;
  
  if (token !== 'casamento') {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Acesso Restrito</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a; color: #fff; margin: 0; }
          .card { background: #252525; padding: 2rem; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
          h2 { color: #d4af37; margin-bottom: 1rem; }
          input { padding: 10px 14px; border-radius: 6px; border: 1px solid #444; background: #111; color: #fff; font-size: 1rem; }
          button { padding: 10px 18px; margin-left: 8px; border-radius: 6px; border: none; background: #d4af37; color: #111; font-weight: bold; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>💍 Painel dos Noivos</h2>
          <p>Informe a senha para acessar o painel:</p>
          <form method="GET" action="/api/admin">
            <input type="password" name="senha" placeholder="Senha" autofocus required>
            <button type="submit">Entrar</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const client = getRedis();

    // ROTA DE EXCLUSÃO (DELETE via query params: action=delete&type=presence|message&id=...)
    if (req.query.action === 'delete') {
      const type = req.query.type;
      const targetId = req.query.id;

      if (!targetId || !type) {
        return res.status(400).send('ID ou tipo inválido.');
      }

      if (type === 'presence') {
        const presencesStr = await client.get('presences_list');
        let presences = presencesStr ? JSON.parse(presencesStr) : [];
        presences = presences.filter(p => p.id !== targetId);
        await client.set('presences_list', JSON.stringify(presences));
      } else if (type === 'message') {
        const msgsStr = await client.get('messages_list');
        let messages = msgsStr ? JSON.parse(msgsStr) : [];
        messages = messages.filter(m => m.id !== targetId);
        await client.set('messages_list', JSON.stringify(messages));
      }

      // Redireciona de volta para o painel limpo
      return res.writeHead(302, { Location: `/api/admin?senha=${encodeURIComponent(token)}&msg=removido` }).end();
    }
    
    // Puxa as presenças
    const presencesStr = await client.get('presences_list');
    const presences = presencesStr ? JSON.parse(presencesStr) : [];
    
    // Puxa as mensagens
    const msgsStr = await client.get('messages_list');
    const messages = msgsStr ? JSON.parse(msgsStr) : [];

    // Checagem de nomes repetidos para alertar visualmente no painel
    const nameCounts = {};
    presences.forEach(p => {
      const k = (p.name || '').trim().toLowerCase();
      if (k) nameCounts[k] = (nameCounts[k] || 0) + 1;
    });
    
    let pRows = presences.map(p => {
      const isBlocked = isIpBlocked(p.ip);
      const isRepeated = nameCounts[(p.name || '').trim().toLowerCase()] > 1;
      const badgeRepeat = isRepeated ? '<span class="badge badge-warn">⚠️ Repetido</span>' : '';
      const badgeBlocked = isBlocked ? '<span class="badge badge-danger">🚫 Bloqueado</span>' : '';

      return `
        <tr class="${isBlocked ? 'row-blocked' : ''}">
          <td>
            <strong>${p.name || '-'}</strong> ${badgeRepeat} ${badgeBlocked}
          </td>
          <td>${p.phone ? `<a href="https://wa.me/55${p.phone.replace(/\\D/g, '')}" target="_blank" style="color: #27ae60; text-decoration: none; font-weight: 500;">📲 ${p.phone}</a>` : '-'}</td>
          <td style="font-family: monospace; font-size: 0.85rem; color: ${isBlocked ? '#e74c3c' : '#555'};">${p.ip || '-'}</td>
          <td style="font-size: 0.85rem; color: #666;">${p.timestamp ? new Date(p.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}</td>
          <td style="text-align: center;">
            <button class="btn-del" onclick="confirmDelete('presence', '${p.id}', '${(p.name || '').replace(/'/g, "\\'")}')" title="Excluir confirmação">
              ✕
            </button>
          </td>
        </tr>
      `;
    }).join('');

    let mRows = messages.map(m => `
      <tr>
        <td><strong>${m.name || '-'}</strong></td>
        <td style="max-width: 400px; word-break: break-word;">${m.text || '-'}</td>
        <td style="font-size: 0.85rem; color: #666;">${m.timestamp ? new Date(m.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}</td>
        <td style="text-align: center;">
          <button class="btn-del" onclick="confirmDelete('message', '${m.id}', 'mensagem de ${(m.name || '').replace(/'/g, "\\'")}')" title="Excluir mensagem">
            ✕
          </button>
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>Painel dos Noivos - Luíza & Luan</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
             * { box-sizing: border-box; }
             body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #f4f6f8; color: #2d3748; margin: 0; }
             .container { max-width: 1050px; margin: 0 auto; }
             header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
             h1 { color: #b8860b; margin: 0; font-size: 1.8rem; }
             .stats-bar { display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
             .stat-card { background: white; padding: 15px 22px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); flex: 1; min-width: 180px; }
             .stat-card span { font-size: 0.85rem; color: #718096; text-transform: uppercase; font-weight: 600; display: block; }
             .stat-card strong { font-size: 1.8rem; color: #1a202c; }
             .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden; margin-bottom: 35px; }
             .card-header { padding: 16px 20px; background: #fff; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center; }
             .card-header h2 { margin: 0; font-size: 1.25rem; color: #2d3748; }
             table { width: 100%; border-collapse: collapse; }
             th, td { padding: 12px 18px; text-align: left; border-bottom: 1px solid #edf2f7; vertical-align: middle; }
             th { background: #f8fafc; color: #4a5568; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
             tr:hover { background-color: #fcfdfd; }
             .row-blocked { background-color: #fff5f5 !important; }
             .badge { font-size: 0.72rem; padding: 3px 8px; border-radius: 9999px; font-weight: 600; display: inline-block; margin-left: 6px; }
             .badge-warn { background: #feebc8; color: #c05621; }
             .badge-danger { background: #fed7d7; color: #9b2c2c; }
             .btn-del {
               background: #fff;
               color: #e53e3e;
               border: 1px solid #fed7d7;
               width: 30px;
               height: 30px;
               border-radius: 50%;
               font-size: 14px;
               font-weight: bold;
               cursor: pointer;
               transition: all 0.2s;
               display: inline-flex;
               align-items: center;
               justify-content: center;
             }
             .btn-del:hover {
               background: #e53e3e;
               color: white;
               transform: scale(1.1);
             }
             .empty { text-align: center; padding: 30px; color: #a0aec0; font-style: italic; }
             .alert { background: #c6f6d5; color: #22543d; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; }
             .blocked-box { background: #2d3748; color: #edf2f7; padding: 15px 20px; border-radius: 10px; margin-bottom: 30px; font-size: 0.9rem; }
             .blocked-box strong { color: #f56565; }
          </style>
        </head>
        <body>
          <div class="container">
            <header>
              <div>
                <h1>💍 Painel Administrativo dos Noivos</h1>
                <p style="margin: 4px 0 0; color: #718096; font-size: 0.9rem;">Gerenciamento de Presenças e Mensagens em tempo real</p>
              </div>
            </header>

            ${req.query.msg === 'removido' ? '<div class="alert">✓ Registro excluído com sucesso do banco de dados!</div>' : ''}

            <div class="stats-bar">
              <div class="stat-card">
                <span>Total de Confirmações</span>
                <strong>${presences.length}</strong>
              </div>
              <div class="stat-card">
                <span>Mensagens no Mural</span>
                <strong>${messages.length}</strong>
              </div>
              <div class="stat-card">
                <span>IPs Bloqueados</span>
                <strong style="color: #e53e3e;">${BLOCKED_IPS.length}</strong>
              </div>
            </div>

            <div class="blocked-box">
              🛡️ <strong>Controle de Bloqueio de Acesso:</strong> O IP <code>${BLOCKED_IPS.join(', ')}</code> está permanentemente bloqueado de enviar presenças ou mensagens no site.
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2>📋 Lista de Confirmações de Presença (${presences.length})</h2>
              </div>
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>Nome do Convidado</th>
                      <th>WhatsApp</th>
                      <th>IP</th>
                      <th>Data/Hora</th>
                      <th style="text-align: center; width: 60px;">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pRows || '<tr><td colspan="5" class="empty">Nenhuma presença confirmada ainda.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2>✉️ Mural de Mensagens (${messages.length})</h2>
              </div>
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Mensagem</th>
                      <th>Data/Hora</th>
                      <th style="text-align: center; width: 60px;">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${mRows || '<tr><td colspan="4" class="empty">Nenhuma mensagem enviada ainda.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <script>
            function confirmDelete(type, id, desc) {
              if (confirm('Tem certeza que deseja excluir ' + desc + ' para sempre do banco de dados?')) {
                const url = window.location.pathname + '?senha=' + encodeURIComponent('${token}') + '&action=delete&type=' + type + '&id=' + id;
                window.location.href = url;
              }
            }
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('Erro ao buscar dados: ' + e.message);
  }
};
