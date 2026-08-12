# Site Luiza & Luan

## Rodar localmente

Copie `.env.example` para `.env` e coloque o token da sua conta Mercado Pago:

```powershell
Copy-Item .env.example .env
notepad .env
node server.js
```

Abra `http://localhost:3000`.

## Mercado Pago

O HTML nao guarda token. O fluxo seguro fica no `server.js`:

1. O convidado seleciona um presente.
2. O site envia o `giftId` para `/api/create-preference`.
3. O servidor valida o presente em `data/gifts.json`.
4. O servidor cria a preferencia no Mercado Pago.
5. O navegador e redirecionado para o checkout retornado pela API.
6. O webhook `/api/mercado-pago/webhook` registra notificacoes em `data/mercado-pago-webhooks.jsonl`.

Edite `data/gifts.json` para trocar nomes, descricoes e valores dos presentes.

## Pagina de presentes

A lista completa fica em `presentes.html`.

- Troque os blocos "Foto do presente" pelas imagens reais quando elas estiverem prontas.
- O presente de valor livre envia `amount` para o backend.
- O presente "Ir vestida de vestido Branco" esta cadastrado por R$ 10.000,00.

## Video

O site usa `assets/VIDEO-2026-03-23-13-47-12.mp4` primeiro para melhorar autoplay nos navegadores. O `.mov` ficou como arquivo original em `assets/`.

## Publicacao

O arquivo principal de publicacao e `index.html`. A pasta `assets/` contem imagens e videos usados pelo site.
