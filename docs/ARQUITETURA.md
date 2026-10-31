# Arquitetura e Engenharia do Sistema: Radar Shopee

## 1. Visão Geral da Arquitetura

O **Radar Shopee** foi concebido como uma esteira de automação orientada a eventos e agendamento (cron-driven), desacoplada em micro-etapas independentes no **n8n**, com persistência centralizada no **Supabase PostgreSQL**.

```
                   ┌─────────────────────────────────────────┐
                   │        Shopee Affiliate Open API        │
                   └────────────────────┬────────────────────┘
                                        │ (GraphQL + SHA256)
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │  01. Workflow: Buscar Ofertas Shopee   │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │          Supabase (status: 'encontrado') │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │ 02. Workflow: Analisador de Oportunidades│
                   │ (Filtros + Score Ponderado 0-100)       │
                   └────────────────────┬────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
             [status: 'rejeitado']         [status: 'aprovado']
                                                       │
                                                       ▼
                                    ┌─────────────────────────────────────┐
                                    │ 03. Workflow: Geração de Copys IA   │
                                    │ (OpenAI / Gemini / Claude)          │
                                    └──────────────────┬──────────────────┘
                                                       │
                                                       ▼
                                    ┌─────────────────────────────────────┐
                                    │ 04. Workflow: Fila e Publicação     │
                                    │ (Controle de Duplicidade Estrito)   │
                                    └──────────────────┬──────────────────┘
                                                       │
                                        ┌──────────────┴──────────────┐
                                        ▼                             ▼
                              Canal Telegram Principal       Grupo Telegram VIPs
                                        │                             │
                                        └──────────────┬──────────────┘
                                                       │
                                                       ▼
                                    ┌─────────────────────────────────────┐
                                    │  05. Relatório Diário Executivo     │
                                    │  06. Gerenciamento Global de Falhas │
                                    └─────────────────────────────────────┘
```

---

## 2. Padrões de Engenharia Adotados

### 2.1. Idempotência e Antiduplicidade
- **Nível Banco:** Chave única `(product_id, telegram_channel)` na tabela `publications`. Nenhuma postagem para o mesmo canal ocorre duas vezes.
- **Nível Workflow:** O fluxo de publicação consulta previamente a existência do par antes de efetuar a chamada para a Telegram Bot API.
- **Identificador de Catálogo:** Chave única `shopee_item_id` na tabela `products`. Atualizações repetidas do mesmo item na Shopee realizam `UPSERT` sem criar registros fantasmas.

### 2.2. Algoritmo de Pontuação de Oportunidades (Score Ponderado)
Para garantir que apenas os melhores produtos sejam publicados nos horários nobres, cada item recebe uma nota de **0 a 100 pontos**:

$$\text{Score} = \text{Score}_{\text{Desconto}} + \text{Score}_{\text{Avaliação}} + \text{Score}_{\text{Vendas}} + \text{Score}_{\text{Preço}}$$

1. **Desconto (Peso 40%):**
   $$\text{Score}_{\text{Desconto}} = \min\left(\frac{\text{Desconto}}{70} \times 40, 40\right)$$
   *(Produtos com mais de 70% de desconto atingem o teto máximo de 40 pontos).*

2. **Avaliação (Peso 30%):**
   $$\text{Score}_{\text{Avaliação}} = \max\left(0, \min\left(\frac{\text{Avaliação} - 4.0}{1.0} \times 30, 30\right)\right)$$
   *(Foco estrito em produtos com notas entre 4.0 e 5.0 estrelas).*

3. **Vendas Acumuladas (Peso 20%):**
   $$\text{Score}_{\text{Vendas}} = \min\left(\frac{\text{Vendas}}{1000} \times 20, 20\right)$$
   *(Itens com mais de 1.000 vendas garantem a pontuação máxima de prova social).*

4. **Ticket de Compra por Impulso (Peso 10%):**
   - Até R$ 150: 10 pontos
   - Até R$ 350: 8 pontos
   - Até R$ 600: 6 pontos
   - Acima: 5 pontos

---

## 3. Preparado para Múltiplos Marketplaces

A estrutura do banco já conta com a coluna `marketplace` (default `'shopee'`). Para plugar novos marketplaces futuramente (Amazon, Magalu, Mercado Livre), basta:
1. Criar um novo workflow coletor específico (ex: `01b-buscar-ofertas-amazon.json`).
2. Mapear o payload de saída para o mesmo formato normalizado da tabela `products`.
3. Todos os workflows subsequentes (Análise, IA de Copys, Publicação Telegram e Relatórios) funcionarão **sem nenhuma alteração**, usufruindo da mesma infraestrutura.

