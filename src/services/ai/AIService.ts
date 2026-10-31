// Serviço de Geração de Conteúdo e Copys com Inteligência Artificial

export interface ProductCopyInput {
  nome: string;
  preco: number;
  precoAntigo?: number;
  desconto: number;
  avaliacao: number;
  vendas: number;
  categoria: string;
  loja?: string;
}

export class AIService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(apiKey?: string, apiUrl?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
    this.apiUrl = apiUrl || process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.model = model || process.env.AI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Gera legenda de alta conversão para o Telegram com IA
   */
  async generateTelegramCopy(product: ProductCopyInput): Promise<string> {
    if (this.apiKey) {
      try {
        const precoFormatado = product.preco.toFixed(2).replace('.', ',');
        const precoAntigoFormatado = product.precoAntigo
          ? product.precoAntigo.toFixed(2).replace('.', ',')
          : '';

        const systemPrompt = `Você é um copywriter de elite especializado em ofertas e achadinhos para canais de Telegram no Brasil.
Retorne APENAS o texto pronto da postagem, sem introdução, sem aspas, com emojis bem distribuídos e formatação elegante para Telegram.`;

        const userPrompt = `Crie a copy para o seguinte produto:
Nome: ${product.nome}
Preço Atual: R$ ${precoFormatado}
${precoAntigoFormatado ? `Preço Anterior: R$ ${precoAntigoFormatado}` : ''}
Desconto: ${product.desconto}% OFF
Avaliação: ${product.avaliacao} estrelas (${product.vendas} vendas)
Categoria: ${product.categoria}
Loja: ${product.loja || 'Shopee Oficial'}

Siga rigorosamente esta estrutura:
🔥 ACHADINHO DO DIA!

[Nome do produto limpo, enxuto e atrativo]

💰 Por apenas:
🔥 R$ ${precoFormatado} (${product.desconto}% OFF)
${precoAntigoFormatado ? `❌ De R$ ${precoAntigoFormatado}` : ''}

⭐ Avaliação ${product.avaliacao}/5.0 (+${product.vendas} vendas)
🔥 Oferta encontrada!
🛒 Aproveite antes que acabe!`;

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const copy = data?.choices?.[0]?.message?.content?.trim();
          if (copy) return copy;
        }
      } catch (err) {
        console.warn('Falha na chamada da IA externa, gerando copy pelo gerador estruturado interno:', err);
      }
    }

    // Gerador de copy estruturado nativo com alta taxa de conversão (fallback resiliente)
    return this.generateStructuredCopy(product);
  }

  /**
   * Modelo estruturado nativo de copy de alta performance
   */
  private generateStructuredCopy(product: ProductCopyInput): string {
    const precoFormatado = product.preco.toFixed(2).replace('.', ',');
    const precoAntigo = product.precoAntigo
      ? product.precoAntigo.toFixed(2).replace('.', ',')
      : (product.preco / (1 - product.desconto / 100)).toFixed(2).replace('.', ',');

    const nomeCurto = product.nome.length > 65
      ? product.nome.substring(0, 65).trim() + '...'
      : product.nome;

    return `🔥 ACHADINHO DO DIA!

${nomeCurto}

💰 Por apenas:
🔥 R$ ${precoFormatado} (${product.desconto}% OFF)
❌ De R$ ${precoAntigo}

⭐ Avaliação ${product.avaliacao}/5.0 (+${product.vendas.toLocaleString('pt-BR')} vendidos)
🔥 Oferta especial encontrada no radar!
🛒 Aproveite antes que o cupom ou estoque acabe!`;
  }
}

export const defaultAIService = new AIService();

