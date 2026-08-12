# Plano de trabalho - Site Luiza & Luan

## Objetivo

Deixar o site pronto para ser enviado aos convidados, com navegacao funcionando, lista de presentes integrada ao Mercado Pago, arquivos organizados para publicacao e um caminho claro para ajustes finais.

Leitor deste plano: quem for finalizar, publicar ou revisar o projeto.

Ao terminar este plano, a pessoa deve conseguir:

- Rodar o site localmente.
- Testar a lista de presentes.
- Configurar o Mercado Pago.
- Publicar na Vercel.
- Saber quais pontos ainda precisam de decisao do casal.

## Estado atual

O projeto esta em uma fase avancada. A pagina principal existe, a pagina de presentes existe, o backend local responde, ha funcoes serverless para Vercel e os principais assets do casal ja estao dentro da pasta `assets`.

Arquivos principais:

- `index.html`: pagina principal publicada.
- `presentes.html`: pagina completa da lista de presentes.
- `server.js`: servidor local em Node.js.
- `api/create-preference.js`: endpoint de checkout para Vercel.
- `api/mercado-pago/webhook.js`: webhook de notificacoes na Vercel.
- `data/gifts.json`: lista de presentes usada pelo servidor local.

## O que ja esta pronto

- Pagina principal com hero, historia, presentes, mural, playlist, video e rodape.
- Pagina separada para lista completa de presentes.
- Assets principais organizados em `assets`.
- Video MP4 disponivel para melhor compatibilidade nos navegadores.
- Fluxo de checkout usando endpoint backend, sem token no HTML.
- Validacao basica de presente invalido.
- Validacao de valor minimo para presente de valor livre.
- Estrutura de deploy ligada a um projeto Vercel.
- Sintaxe dos arquivos Node validada.
- Teste local confirmou resposta `200` para pagina principal, pagina de presentes, imagem e video.
- `index.html` e a unica fonte da pagina principal; a antiga copia `wedding-luiza-luan-3.html` foi removida para evitar divergencia.

## Pendencias obrigatorias antes de publicar

### 1. Evitar divergencia na lista de presentes

Hoje existem duas fontes para os presentes:

- O servidor local le `data/gifts.json`.
- A pagina de presentes ainda tem uma lista visual propria para funcionar mesmo aberta como arquivo local.

Escolher uma das abordagens:

- Manter a pagina visual como copia simples, mas editar `data/gifts.json` como fonte principal de pagamento.
- Melhorar a pagina para carregar `data/gifts.json` quando estiver rodando pelo servidor.

Criterio de pronto:

- Editar um presente em um unico lugar deve ser suficiente, ou a regra de edicao dupla precisa estar documentada.

Status:

- A API da Vercel ja usa `data/gifts.json`.

### 2. Finalizar visual dos presentes

Os cards nao devem exibir texto de placeholder. Enquanto nao houver imagens reais, usar uma composicao visual elegante por categoria.

Criterio de pronto:

- Nenhum convidado deve ver texto de placeholder.

Status:

- Placeholders substituidos por identificadores visuais de categoria.

### 3. Revisar texto final com o casal

Validar:

- Grafia dos nomes.
- Data do casamento.
- Historia do casal.
- Tom das mensagens.
- Se o presente "Ir vestida de vestido Branco" deve continuar com esse nome e valor.

### 4. Revisar experiencia no celular

Testar pelo menos:

- Tela pequena de celular.
- Celular grande.
- Desktop.
- Navegacao por toque.
- Carregamento do video.
- Botoes da lista de presentes.

### 5. Definir dominio ou link publico

Escolher entre:

- URL padrao da Vercel.
- Dominio proprio.
- Subdominio personalizado.

### 6. Configurar Mercado Pago

Este item fica por ultimo, depois de validar conteudo, layout e publicacao basica.

Criar um arquivo `.env` local, baseado em `.env.example`, com:

```env
MERCADO_PAGO_ACCESS_TOKEN=coloque_o_token_aqui
SITE_URL=http://localhost:3000
```

Na Vercel, configurar tambem:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `SITE_URL` com a URL publica final

Criterio de pronto:

- Um presente real ou de teste abre o checkout do Mercado Pago sem erro.

### 7. Testar pagamento de ponta a ponta

Testar no fluxo real:

1. Abrir o site.
2. Ir para presentes.
3. Escolher um presente fixo.
4. Escolher presente de valor livre.
5. Confirmar redirecionamento para checkout.
6. Voltar para o site apos sucesso, falha ou pendencia.
7. Confirmar recebimento do webhook.

Criterio de pronto:

- O casal consegue confirmar que o pagamento foi recebido ou registrado.

## Pendencias recomendadas

### 1. Melhorar webhook da Vercel

Hoje o webhook da Vercel apenas registra no log. Para uso real, decidir onde salvar as notificacoes:

- Planilha.
- Banco de dados.
- Arquivo fora da Vercel.
- Painel simples.
- Apenas logs da Vercel, se for suficiente.

## Ordem de execucao recomendada

1. Rodar `node server.js`.
2. Testar `http://localhost:3000`.
3. Testar `http://localhost:3000/presentes.html`.
4. Revisar a pagina de presentes sem placeholders.
5. Revisar textos finais.
6. Testar no celular.
7. Definir link publico ou dominio.
8. Publicar e testar a URL publica.
9. Criar `.env` local com token do Mercado Pago.
10. Configurar variaveis de ambiente na Vercel.
11. Fazer um teste de checkout com valor baixo ou ambiente sandbox.
12. Validar webhook ou estrategia de registro.
13. Enviar ao casal para aprovacao final.

## Comandos uteis

Rodar localmente:

```powershell
node server.js
```

Abrir no navegador:

```text
http://localhost:3000
```

Validar sintaxe dos arquivos Node:

```powershell
node --check server.js
node --check api\create-preference.js
node --check api\mercado-pago\webhook.js
```

## Checklist final de publicacao

- [x] API da Vercel usando `data/gifts.json`.
- [x] Placeholders dos presentes removidos.
- [ ] `.env` local configurado.
- [ ] Variaveis de ambiente configuradas na Vercel.
- [ ] Checkout do Mercado Pago testado.
- [ ] Webhook testado ou estrategia de registro definida.
- [ ] Textos finais aprovados.
- [ ] Site testado no celular.
- [ ] Link publico definido.
- [ ] Pagina principal abre sem erro.
- [ ] Pagina de presentes abre sem erro.
- [ ] Video carrega corretamente.
- [ ] Imagens carregam corretamente.

## Proximo passo imediato

Rodar o servidor local e revisar visualmente a pagina de presentes no navegador. O Mercado Pago fica como ultima etapa tecnica, depois que conteudo, layout e link publico estiverem aprovados.
