// Persistência local em disco (JSON + sincronização .env) para garantir que
// credenciais e dados nunca sejam perdidos entre reinicializações do servidor.

import fs from 'fs';
import path from 'path';
import {
  Product,
  TelegramChannel,
  Publication,
  ShopeeAccountConfig,
  AutomationSettings,
  SystemLog,
} from './types';

const isServerless =
  process.env.VERCEL === '1' ||
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
  (process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(process.cwd(), 'data')));

const DATA_DIR = isServerless ? path.join('/tmp', 'radar_data') : path.join(process.cwd(), 'data');
const ENV_PATH = path.join(process.cwd(), '.env');

function ensureDataDir(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function readJsonFile<T>(filename: string, fallback: T): T {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    return fallback;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  try {
    if (!ensureDataDir()) return;
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Silenciosamente ignorado em ambientes serverless com sistema de arquivos somente-leitura
  }
}

export function cleanTelegramChatId(chatId: string): string {
  let clean = (chatId || '').trim();
  // Se for link do tipo https://t.me/radarsshopee ou t.me/radarsshopee
  if (clean.includes('t.me/')) {
    clean = clean.split('t.me/')[1].split('/')[0].split('?')[0].replace('+', '');
  }
  // Se não começar com @ e não for número (ex: -100... ou 12345678), adiciona @
  if (clean && !clean.startsWith('@') && !/^-?\d+$/.test(clean)) {
    clean = `@${clean}`;
  }
  return clean;
}

export function syncToEnvFile(key: string, value: string): void {
  try {
    process.env[key] = value;
    if (isServerless) return;

    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;

    if (regex.test(content)) {
      content = content.replace(regex, newLine);
    } else {
      content = content ? `${content.trim()}\n${newLine}\n` : `${newLine}\n`;
    }

    fs.writeFileSync(ENV_PATH, content, 'utf-8');
  } catch (err) {
    // Silenciosamente ignorado em ambientes serverless
  }
}

export const fileStorage = {
  getShopeeConfig(): ShopeeAccountConfig {
    const defaults: ShopeeAccountConfig = {
      appId: process.env.SHOPEE_APP_ID || '',
      secretKey: process.env.SHOPEE_SECRET || '',
      accessToken: process.env.SHOPEE_ACCESS_TOKEN || '',
      status: process.env.SHOPEE_APP_ID ? 'ativo' : 'inativo',
      mensagemStatus: process.env.SHOPEE_APP_ID
        ? 'Configurado via ambiente'
        : 'Aguardando preenchimento das credenciais oficiais',
    };
    return readJsonFile<ShopeeAccountConfig>('shopee_config.json', defaults);
  },

  saveShopeeConfig(config: Partial<ShopeeAccountConfig>): ShopeeAccountConfig {
    const current = this.getShopeeConfig();
    const updated: ShopeeAccountConfig = {
      ...current,
      ...config,
      // Não sobrescreve chaves com valores mascarados
      secretKey:
        config.secretKey && !config.secretKey.includes('•••')
          ? config.secretKey
          : current.secretKey,
      accessToken:
        config.accessToken && !config.accessToken.includes('•••')
          ? config.accessToken
          : current.accessToken,
    };

    writeJsonFile('shopee_config.json', updated);

    // Sincroniza com variáveis de ambiente do processo e arquivo .env
    if (updated.appId) syncToEnvFile('SHOPEE_APP_ID', updated.appId);
    if (updated.secretKey) syncToEnvFile('SHOPEE_SECRET', updated.secretKey);
    if (updated.accessToken) syncToEnvFile('SHOPEE_ACCESS_TOKEN', updated.accessToken);

    return updated;
  },

  getTelegramConfig(): { botToken: string } {
    const defaults = { botToken: process.env.TELEGRAM_BOT_TOKEN || '' };
    return readJsonFile<{ botToken: string }>('telegram_config.json', defaults);
  },

  saveTelegramConfig(token: string): { botToken: string } {
    const updated = { botToken: (token || '').trim() };
    writeJsonFile('telegram_config.json', updated);
    if (updated.botToken) {
      syncToEnvFile('TELEGRAM_BOT_TOKEN', updated.botToken);
    }
    return updated;
  },

  getProducts(): Product[] {
    return readJsonFile<Product[]>('products.json', []);
  },

  saveProducts(products: Product[]): void {
    writeJsonFile('products.json', products);
  },

  getChannels(): TelegramChannel[] {
    const defaultChatId = process.env.TELEGRAM_CHAT_ID || '@radarsshopee';
    const list = readJsonFile<TelegramChannel[]>('channels.json', [
      {
        id: 'chan-001',
        nome: 'Canal Principal Achadinhos Shopee',
        chat_id: defaultChatId,
        tipo: 'canal',
        ativo: true,
        total_enviados: 0,
        created_at: new Date().toISOString(),
      },
    ]);
    return list.map((c) => ({
      ...c,
      chat_id: cleanTelegramChatId(c.chat_id),
    }));
  },

  saveChannels(channels: TelegramChannel[]): void {
    const sanitized = channels.map((c) => ({
      ...c,
      chat_id: cleanTelegramChatId(c.chat_id),
    }));
    writeJsonFile('channels.json', sanitized);
  },

  getPublications(): Publication[] {
    return readJsonFile<Publication[]>('publications.json', []);
  },

  savePublications(publications: Publication[]): void {
    writeJsonFile('publications.json', publications);
  },

  getAutomationSettings(): AutomationSettings {
    const defaults: AutomationSettings = {
      ativo: true,
      quantidade_diaria: 20,
      intervalo_minutos: 30,
      horarios_disparo: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
      auto_aprovar_score_minimo: 70.0,
      auto_gerar_copys_ia: true,
      auto_publicar: true,
    };
    return readJsonFile<AutomationSettings>('automation_settings.json', defaults);
  },

  saveAutomationSettings(settings: AutomationSettings): void {
    writeJsonFile('automation_settings.json', settings);
  },

  getLogs(): SystemLog[] {
    return readJsonFile<SystemLog[]>('logs.json', []);
  },

  saveLogs(logs: SystemLog[]): void {
    writeJsonFile('logs.json', logs);
  },
};
