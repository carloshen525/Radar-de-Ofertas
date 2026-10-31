# Guia Oficial de Conexão: Shopee Affiliate Open API

Este guia explica como funciona a autenticação e a integração com a **API Oficial de Afiliados da Shopee (Shopee Affiliate Open Platform)** utilizada nos workflows do n8n do Radar Shopee.

---

## 1. O que você precisa da Shopee

1. Conta ativa no programa de afiliados: [https://affiliate.shopee.com.br/](https://affiliate.shopee.com.br/)
2. Acesso à Shopee Open Platform / Affiliate Open API:
   - Acessar o portal de desenvolvedor de afiliados.
   - Criar uma Aplicação para obter:
     - **App ID** (identificador público da aplicação)
     - **Secret Key** (chave secreta compartilhada usada para gerar assinaturas)

> ⚠️ **Segurança:** Nunca compartilhe nem suba sua Secret Key para o GitHub ou canais públicos. No n8n, essas credenciais são salvas em nós de credenciais ou variáveis de ambiente.

---

## 2. Como Funciona a Autenticação (SHA-256 Signature)

A Shopee Affiliate API utiliza **GraphQL** sobre HTTPS e exige um cabeçalho HTTP de autorização com assinatura criptográfica SHA-256 gerada dinamicamente a cada requisição.

### Parâmetros da Assinatura:
- **Timestamp:** Timestamp Unix atual em segundos (`Math.floor(Date.now() / 1000)`).
- **Payload:** O corpo da requisição JSON em formato string (`JSON.stringify(queryPayload)`).
- **Fórmula de Assinatura:**
  ```javascript
  const factor = appId + timestamp + payload + secret;
  const signature = crypto.createHash('sha256').update(factor).digest('hex');
  ```

### Cabeçalho HTTP Requerido:
```http
Authorization: SHA256 Credential={app_id}, Timestamp={timestamp}, Signature={signature}
Content-Type: application/json
```

---

## 3. Endpoints Disponíveis

| Região | Endpoint GraphQL |
|---|---|
| **Brasil (Principal)** | `https://open-api.affiliate.shopee.com.br/graphql` |
| **Global / Internacional** | `https://open-api.affiliate.shopee.com/graphql` |

---

## 4. Query de Busca de Ofertas (`productOfferV2`)

Exemplo da query utilizada pelo **Workflow 1**:

```graphql
query SearchShopeeProducts($keyword: String, $page: Int, $limit: Int, $sortType: Int) {
  productOfferV2(keyword: $keyword, page: $page, limit: $limit, sortType: $sortType) {
    nodes {
      itemId
      productName
      imageUrl
      priceMin
      priceMax
      priceDiscountRate
      sales
      ratingStar
      shopName
      shopType
      productLink
      offerLink
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}
```

---

## 5. Gerador de Links de Afiliado Encurtados (`generateShortLink`)

Caso o produto venha apenas com `productLink`, a Shopee disponibiliza a seguinte mutation GraphQL para gerar o link com rastreamento:

```graphql
mutation GenerateAffiliateLink($originUrl: String!, $subIds: [String]) {
  generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
    shortLink
  }
}
```

---

## 6. Implementação no n8n

Nos workflows do n8n deste projeto, a autenticação é tratada pelo nó **"Preparar Requisição Shopee (Code)"**, que utiliza o módulo `crypto` nativo do Node.js:

```javascript
const crypto = require('crypto');

const appId = $env.SHOPEE_APP_ID || 'SEU_APP_ID';
const secret = $env.SHOPEE_SECRET || 'SEU_SECRET';
const timestamp = Math.floor(Date.now() / 1000);

const payload = JSON.stringify({
  query: `...`,
  variables: { ... }
});

const factor = appId + timestamp + payload + secret;
const signature = crypto.createHash('sha256').update(factor).digest('hex');

return [{
  json: {
    url: 'https://open-api.affiliate.shopee.com.br/graphql',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
    },
    body: JSON.parse(payload)
  }
}];
```
Isso garante conformidade total com a especificação oficial da Shopee, sem dependências de scrapers e sem risco de banimento.

