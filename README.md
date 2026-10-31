# 🚀 Radar Shopee - Plataforma Web SaaS de Automação de Afiliados

Plataforma online completa e profissional de automação, descoberta e publicação de ofertas da **Shopee** no **Telegram**, construída com **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL** e integração 100% oficial com a **Shopee Affiliate Open Platform (GraphQL)**.

---

## 🌟 Visão Geral do Sistema

O **Radar Shopee** transforma o fluxo de afiliados em uma máquina automatizada e centralizada através de um dashboard próprio e esteira Kanban:

- 🛡️ **Integração 100% Oficial:** Zero Playwright, zero Puppeteer, zero scraping. Todas as buscas e links comissionados são operados via API oficial de afiliados da Shopee com assinatura criptográfica `SHA-256`.
- 📊 **Dashboard Geral em Tempo Real:** Acompanhamento de métricas de produtos minerados, ofertas aprovadas, taxa de postagem e status operacional dos conectores.
- 🎯 **Radar de Produtos Inteligente:** Varredura em categorias estratégicas (*Eletrônicos, Casa, Beleza, Moda, Games, Ferramentas, Celulares, Informática*) com filtros avançados de desconto mínimo, avaliação, vendas e teto de preço.
- 📋 **Esteira de Ofertas (Kanban):** Gestão visual completa em 5 etapas:  
  `Encontrados` ➔ `Analisando` ➔ `Aprovados` ➔ `Agendados` ➔ `Publicados`.
- 🧠 **Copywriter IA Integrado:** Geração automática e sob demanda de textos persuasivos e formatados para Telegram com gatilhos de escassez e desconto.
- 📢 **Publicação Multi-Canais no Telegram:** Envio programado com foto do produto, legenda da IA e botão inline oficial `[ 🛒 Comprar agora ]`.
- 🔁 **Controle Rigoroso de Duplicidade:** Idempotência no banco de dados e na fila para impedir reenvios do mesmo produto para o mesmo canal.
- ⚙️ **Agendador de Tarefas em Background (5 Jobs):**
  - **Job 1:** Busca novos produtos nas categorias configuradas.
  - **Job 2:** Analisa oportunidades e calcula pontuação ponderada (Score de 0 a 100).
  - **Job 3:** Redige copys persuasivas com IA.
  - **Job 4:** Publica no Telegram evitando duplicidades.
  - **Job 5:** Consolida relatórios de métricas.
- 🌐 **Arquitetura Multi-Marketplace:** Camada `MarketplaceProvider` modular com suporte nativo à Shopee e preparada para Mercado Livre, Amazon e AliExpress.

---

## 📁 Estrutura do Projeto

```
Radar de Ofertas/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Módulo 1: Dashboard Principal
│   │   ├── shopee/page.tsx               # Módulo 2: Configuração Shopee
│   │   ├── radar/page.tsx                # Módulo 3: Radar de Produtos & Filtros
│   │   ├── esteira/page.tsx              # Módulo 4: Esteira de Ofertas Kanban
│   │   ├── telegram/page.tsx             # Módulo 6: Telegram (Bot & Canais)
│   │   ├── automacao/page.tsx            # Módulo 7: Agendamento & Background Jobs
│   │   ├── historico/page.tsx            # Módulo 8: Histórico de Publicações
│   │   ├── logs/page.tsx                 # Módulo 10: Central de Logs do Sistema
│   │   └── api/                          # Backend API próprio em Node.js / Next.js
│   │       ├── dashboard/stats/route.ts
│   │       ├── shopee/config/route.ts
│   │       ├── shopee/test/route.ts
│   │       ├── radar/search/route.ts
│   │       ├── offers/route.ts
│   │       ├── offers/[id]/generate-copy/route.ts
│   │       ├── offers/[id]/publish/route.ts
│   │       ├── telegram/channels/route.ts
│   │       ├── telegram/test/route.ts
│   │       ├── automation/settings/route.ts
│   │       ├── automation/run-job/route.ts
│   │       ├── publications/route.ts
│   │       └── logs/route.ts
│   ├── components/
│   │   ├── Sidebar.tsx                   # Navegação lateral moderna SaaS
│   │   ├── Header.tsx                    # Topbar com ações e status dos serviços
│   │   ├── MetricCard.tsx                # Cards de indicadores
│   │   └── ProductModal.tsx              # Modal de edição de copy e preview Telegram
│   ├── services/
│   │   ├── marketplace/
│   │   │   ├── MarketplaceProvider.ts    # Interface abstrata para marketplaces
│   │   │   ├── ShopeeProvider.ts         # Conector oficial GraphQL com Auth SHA256
│   │   │   ├── MercadoLivreProvider.ts   # Preparado para Mercado Livre
│   │   │   └── AmazonProvider.ts         # Preparado para Amazon PA-API
│   │   ├── ai/
│   │   │   └── AIService.ts              # Geração de copys com OpenAI / Gemini
│   │   ├── telegram/
│   │   │   └── TelegramService.ts        # Disparador Telegram Bot API (Photo + Inline Button)
│   │   └── scheduler/
│   │       └── AutomationEngine.ts       # Motor dos 5 Jobs automáticos da esteira
│   └── lib/
│       ├── types.ts                      # Tipos TypeScript
│       └── db.ts                         # Camada de banco (Supabase + fallback sincronizado)
├── supabase/
│   └── schema_saas.sql                   # DDL das 10 tabelas do banco SaaS
├── .env.example                          # Modelo de credenciais
└── package.json
```

---

## 🚀 Como Executar o Sistema

### 1. Pré-requisitos
- Node.js 18+ (testado no Node.js v24)
- NPM ou Yarn

### 2. Configurar o Banco de Dados (Supabase)
1. Crie um projeto no [Supabase](https://supabase.com/).
2. Acesse o **SQL Editor**, cole o código de [`supabase/schema_saas.sql`](file:///c:/Users/SAMSUNG/Desktop/Sites/Radar%20de%20Ofertas/supabase/schema_saas.sql) e execute.
3. As 10 tabelas serão geradas com integridade referencial:
   - `users`
   - `shopee_accounts`
   - `products`
   - `product_searches`
   - `affiliate_links`
   - `offer_queue`
   - `telegram_channels`
   - `publications`
   - `automation_settings`
   - `system_logs`

### 3. Configurar as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Preencha com suas credenciais:
- `SHOPEE_APP_ID` e `SHOPEE_SECRET` (obtidas no portal [Shopee Affiliate Open Platform](https://affiliate.shopee.com.br/))
- `TELEGRAM_BOT_TOKEN` (gerado com o [@BotFather](https://t.me/BotFather))
- `OPENAI_API_KEY` ou `AI_API_KEY` (para geração de copys com IA)
- `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`

### 4. Iniciar em Desenvolvimento
```bash
npm run dev
```
Acesse **http://localhost:3000** no seu navegador. O painel estará disponível com visual moderno e responsivo.

---

## 🎯 Guia Rápido dos Módulos

1. **Dashboard (`/`):** Acompanhe o total de produtos encontrados hoje, ofertas aprovadas e publicadas, status dos conectores e histórico recente.
2. **Radar de Ofertas (`/radar`):** Filtre por categorias, palavras-chave, desconto mínimo (ex: 30%), estrelas mínimas (ex: 4.5) e dispare varreduras ao vivo.
3. **Esteira Kanban (`/esteira`):** Visualize os cards em colunas, gere copys instantâneas com IA, edite o texto, aprove ou publique com um clique.
4. **Configuração Shopee (`/shopee`):** Insira o App ID e Secret Key e teste a autenticação SHA-256 com feedback imediato.
5. **Telegram (`/telegram`):** Cadastre múltiplos canais ou grupos onde seu bot é administrador e execute disparos de teste.
6. **Automação & Jobs (`/automacao`):** Programe os horários diários (ex: 08:00, 10:00, 12:00...) ou execute os 5 Jobs em background sob demanda.
7. **Histórico (`/historico`):** Tabela detalhada de todas as postagens realizadas com links rastreáveis de afiliados.
8. **Central de Logs (`/logs`):** Diagnóstico em tempo real de requisições, sucessos e eventuais erros da API da Shopee, IA ou Telegram.
