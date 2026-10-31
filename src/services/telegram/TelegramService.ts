// Serviço Oficial da API de Bots do Telegram

import { cleanTelegramChatId, fileStorage } from '@/lib/storage';

export interface TelegramPublishOptions {
  botToken?: string;
  chatId: string;
  photoUrl: string;
  caption: string;
  affiliateUrl: string;
  buttonText?: string;
}

function formatTelegramError(rawDescription: string, chatId: string): string {
  if (rawDescription.includes('chat not found')) {
    return `Chat não encontrado (${chatId}). Certifique-se de: 1) Adicionar o seu Bot dentro do canal/grupo como ADMINISTRADOR com permissão de publicar mensagens; 2) Se o canal for público, digite @seucanal (não use link https://t.me); se for privado, use o ID numérico (ex: -100...).`;
  }
  if (
    rawDescription.includes('not enough rights') ||
    rawDescription.includes('have no rights') ||
    rawDescription.includes('need administrator rights')
  ) {
    return `Permissão insuficiente: O bot está no chat, mas precisa ser promovido a ADMINISTRADOR com permissão de 'Publicar Mensagens'.`;
  }
  if (rawDescription.includes('bot was blocked by the user')) {
    return `O bot foi bloqueado pelo usuário. É necessário iniciar a conversa com o bot no Telegram digitando /start.`;
  }
  return `Erro da API do Telegram: ${rawDescription}`;
}

export class TelegramService {
  private defaultBotToken: string;

  constructor(botToken?: string) {
    const saved = fileStorage.getTelegramConfig().botToken;
    this.defaultBotToken = botToken || process.env.TELEGRAM_BOT_TOKEN || saved || '';
  }

  private getActiveToken(token?: string): string {
    return (
      (token || '').trim() ||
      this.defaultBotToken ||
      process.env.TELEGRAM_BOT_TOKEN ||
      fileStorage.getTelegramConfig().botToken ||
      ''
    );
  }

  /**
   * Valida o token do Bot junto à API do Telegram
   */
  async testBot(token?: string): Promise<{ success: boolean; botName?: string; username?: string; message: string }> {
    const activeToken = this.getActiveToken(token);
    if (!activeToken) {
      return { success: false, message: 'Token do Telegram Bot não fornecido. Insira o token do @BotFather.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${activeToken}/getMe`);
      const data = await res.json();

      if (data.ok) {
        // Salva o token validado para persistência
        fileStorage.saveTelegramConfig(activeToken);

        return {
          success: true,
          botName: data.result.first_name,
          username: data.result.username,
          message: `Bot conectado com sucesso: @${data.result.username} (${data.result.first_name})`,
        };
      }
      return { success: false, message: `Erro da API do Telegram: ${data.description}` };
    } catch (err: any) {
      return { success: false, message: `Falha na requisição ao Telegram: ${err.message}` };
    }
  }

  /**
   * Envia mensagem de teste para um canal ou grupo
   */
  async sendTestMessage(chatId: string, token?: string): Promise<{ success: boolean; message: string }> {
    const activeToken = this.getActiveToken(token);
    if (!activeToken) {
      return { success: false, message: 'Bot Token não configurado. Insira o token acima.' };
    }

    const cleanChat = cleanTelegramChatId(chatId);

    try {
      const res = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChat,
          text: '📡 *Radar Shopee*: Canal verificado e conectado com sucesso ao sistema!',
          parse_mode: 'Markdown',
        }),
      });

      const data = await res.json();
      if (data.ok) {
        return { success: true, message: `Mensagem de teste enviada com sucesso para ${cleanChat}!` };
      }
      return { success: false, message: formatTelegramError(data.description, cleanChat) };
    } catch (err: any) {
      return { success: false, message: `Falha de rede: ${err.message}` };
    }
  }

  /**
   * Publica a oferta completa: Foto + Legenda + Botão Inline de Compra
   */
  async publishOffer(options: TelegramPublishOptions): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const activeToken = this.getActiveToken(options.botToken);
    if (!activeToken) {
      return { success: false, error: 'Token do bot do Telegram não configurado.' };
    }

    const cleanChat = cleanTelegramChatId(options.chatId);

    try {
      const payload = {
        chat_id: cleanChat,
        photo: options.photoUrl,
        caption: options.caption,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: options.buttonText || '🛒 Comprar agora',
                url: options.affiliateUrl,
              },
            ],
          ],
        },
      };

      const res = await fetch(`https://api.telegram.org/bot${activeToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.ok) {
        return {
          success: true,
          messageId: data.result.message_id,
        };
      }

      // Se falhar o envio de foto (ex: URL externa bloqueada pelo Telegram), tenta com sendMessage
      if (!data.ok) {
        const textPayload = {
          chat_id: cleanChat,
          text: `${options.caption}\n\n🔗 ${options.affiliateUrl}`,
          reply_markup: payload.reply_markup,
        };

        const resFallback = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(textPayload),
        });

        const dataFallback = await resFallback.json();
        if (dataFallback.ok) {
          return { success: true, messageId: dataFallback.result.message_id };
        }

        return {
          success: false,
          error: formatTelegramError(dataFallback.description || data.description, cleanChat),
        };
      }

      return {
        success: false,
        error: formatTelegramError(data.description, cleanChat),
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const defaultTelegramService = new TelegramService();

