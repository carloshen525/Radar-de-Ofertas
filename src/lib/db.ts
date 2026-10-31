// Camada Central de Acesso a Dados (Supabase PostgreSQL + Persistência em Disco)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Product,
  ProductStatus,
  TelegramChannel,
  Publication,
  ShopeeAccountConfig,
  AutomationSettings,
  SystemLog,
  DashboardStats,
} from './types';
import { fileStorage } from './storage';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, key);
      return supabaseInstance;
    } catch {
      return null;
    }
  }
  return null;
}

export const db = {
  // 1. Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const hoje = new Date().toISOString().split('T')[0];
        const { count: encontrados } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', hoje);

        const { count: aprovados } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'aprovado');

        const { count: publicadosHoje } = await supabase
          .from('publications')
          .select('*', { count: 'exact', head: true })
          .gte('published_at', hoje);

        const { count: totalPublicacoes } = await supabase
          .from('publications')
          .select('*', { count: 'exact', head: true });

        const { count: errosHoje } = await supabase
          .from('system_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'erro')
          .gte('created_at', hoje);

        const shopeeConfig = fileStorage.getShopeeConfig();

        return {
          produtosEncontradosHoje: encontrados || 0,
          produtosAprovados: aprovados || 0,
          produtosPublicadosHoje: publicadosHoje || 0,
          totalPublicacoes: totalPublicacoes || 0,
          ultimaSincronizacaoShopee: new Date().toLocaleTimeString('pt-BR'),
          statusTelegram: process.env.TELEGRAM_BOT_TOKEN ? 'conectado' : 'desconectado',
          statusShopeeApi: shopeeConfig.appId ? 'ativo' : 'inativo',
          totalErrosHoje: errosHoje || 0,
        };
      } catch {}
    }

    const hoje = new Date().toISOString().split('T')[0];
    const products = fileStorage.getProducts();
    const publications = fileStorage.getPublications();
    const logs = fileStorage.getLogs();
    const shopeeConfig = fileStorage.getShopeeConfig();

    const encontradosHoje = products.filter((p) => p.created_at.startsWith(hoje)).length;
    const aprovados = products.filter((p) => p.status === 'aprovado').length;
    const publicadosHoje = publications.filter((p) => p.published_at.startsWith(hoje)).length;
    const errosHoje = logs.filter((l) => l.status === 'erro' && l.created_at.startsWith(hoje)).length;

    return {
      produtosEncontradosHoje: encontradosHoje || products.length,
      produtosAprovados: aprovados,
      produtosPublicadosHoje: publicadosHoje,
      totalPublicacoes: publications.length,
      ultimaSincronizacaoShopee: new Date().toLocaleTimeString('pt-BR'),
      statusTelegram: process.env.TELEGRAM_BOT_TOKEN ? 'conectado' : 'desconectado',
      statusShopeeApi: shopeeConfig.appId ? 'ativo' : 'inativo',
      totalErrosHoje: errosHoje,
    };
  },

  // 2. Shopee Config
  async getShopeeConfig(): Promise<ShopeeAccountConfig> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('shopee_accounts').select('*').limit(1).single();
        if (data && data.app_id) {
          return {
            appId: data.app_id,
            secretKey: data.secret_key,
            accessToken: data.access_token,
            status: data.status,
            mensagemStatus: data.mensagem_status,
            ultimoTesteEm: data.ultimo_teste_em,
          };
        }
      } catch {}
    }

    return fileStorage.getShopeeConfig();
  },

  async saveShopeeConfig(config: Partial<ShopeeAccountConfig>): Promise<ShopeeAccountConfig> {
    const saved = fileStorage.saveShopeeConfig(config);

    const supabase = getSupabaseClient();
    if (supabase && saved.appId && saved.secretKey) {
      try {
        await supabase.from('shopee_accounts').upsert({
          app_id: saved.appId,
          secret_key: saved.secretKey,
          access_token: saved.accessToken || null,
          status: saved.status || 'ativo',
          mensagem_status: saved.mensagemStatus || 'Salvo',
          ultimo_teste_em: new Date().toISOString(),
        });
      } catch {}
    }

    return saved;
  },

  // Telegram Config
  async getTelegramConfig(): Promise<{ botToken: string }> {
    return fileStorage.getTelegramConfig();
  },

  async saveTelegramConfig(token: string): Promise<{ botToken: string }> {
    return fileStorage.saveTelegramConfig(token);
  },

  // 3. Products
  async getProducts(status?: ProductStatus, categoria?: string): Promise<Product[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let q = supabase.from('products').select('*').order('created_at', { ascending: false });
        if (status) q = q.eq('status', status);
        if (categoria && categoria !== 'Todas') q = q.eq('categoria', categoria);
        const { data } = await q;
        if (data && data.length > 0) return data as Product[];
      } catch {}
    }

    const all = fileStorage.getProducts();
    return all.filter((p) => {
      if (status && p.status !== status) return false;
      if (categoria && categoria !== 'Todas' && p.categoria.toLowerCase() !== categoria.toLowerCase()) {
        return false;
      }
      return true;
    });
  },

  async addProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const all = fileStorage.getProducts();

    // Remove duplicados pelo ID do item na Shopee
    const existingIndex = all.findIndex(
      (p) => p.external_item_id === product.external_item_id && p.marketplace === product.marketplace
    );

    const newProduct: Product = {
      ...product,
      id: existingIndex !== -1 ? all[existingIndex].id : `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: existingIndex !== -1 ? all[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      all[existingIndex] = newProduct;
    } else {
      all.unshift(newProduct);
    }

    fileStorage.saveProducts(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('products').upsert(newProduct);
      } catch {}
    }

    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const all = fileStorage.getProducts();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) return null;

    all[index] = { ...all[index], ...updates, updated_at: new Date().toISOString() };
    fileStorage.saveProducts(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('products').update(updates).eq('id', id);
      } catch {}
    }

    return all[index];
  },

  async deleteProduct(id: string): Promise<boolean> {
    const all = fileStorage.getProducts().filter((p) => p.id !== id);
    fileStorage.saveProducts(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch {}
    }
    return true;
  },

  async clearProducts(status?: ProductStatus): Promise<{ count: number }> {
    let all = fileStorage.getProducts();
    const countBefore = all.length;

    if (status) {
      all = all.filter((p) => p.status !== status);
    } else {
      all = [];
    }

    const removed = countBefore - all.length;
    fileStorage.saveProducts(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let q = supabase.from('products').delete();
        if (status) {
          q = q.eq('status', status);
        } else {
          q = q.neq('id', '00000000-0000-0000-0000-000000000000');
        }
        await q;
      } catch {}
    }

    return { count: removed };
  },

  // 4. Telegram Channels
  async getChannels(): Promise<TelegramChannel[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('telegram_channels').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) return data as TelegramChannel[];
      } catch {}
    }
    return fileStorage.getChannels();
  },

  async addChannel(channel: Omit<TelegramChannel, 'id' | 'created_at' | 'total_enviados'>): Promise<TelegramChannel> {
    const all = fileStorage.getChannels();
    const newChannel: TelegramChannel = {
      ...channel,
      id: `chan-${Date.now()}`,
      total_enviados: 0,
      created_at: new Date().toISOString(),
    };
    all.push(newChannel);
    fileStorage.saveChannels(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('telegram_channels').insert(newChannel);
      } catch {}
    }
    return newChannel;
  },

  async deleteChannel(id: string): Promise<boolean> {
    const all = fileStorage.getChannels().filter((c) => c.id !== id);
    fileStorage.saveChannels(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('telegram_channels').delete().eq('id', id);
      } catch {}
    }
    return true;
  },

  // 5. Publications
  async getPublications(status?: string): Promise<Publication[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let q = supabase.from('publications').select('*, product:products(*)').order('published_at', { ascending: false });
        if (status) q = q.eq('status', status);
        const { data } = await q;
        if (data && data.length > 0) return data as Publication[];
      } catch {}
    }

    const pubs = fileStorage.getPublications();
    const prods = fileStorage.getProducts();

    const populated = pubs.map((pub) => ({
      ...pub,
      product: prods.find((p) => p.id === pub.product_id),
    }));

    return status ? populated.filter((p) => p.status === status) : populated;
  },

  async addPublication(pub: Omit<Publication, 'id' | 'published_at'>): Promise<Publication> {
    const all = fileStorage.getPublications();
    const newPub: Publication = {
      ...pub,
      id: `pub-${Date.now()}`,
      published_at: new Date().toISOString(),
    };
    all.unshift(newPub);
    fileStorage.savePublications(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('publications').insert(newPub);
      } catch {}
    }
    return newPub;
  },

  // 6. Automation Settings
  async getAutomationSettings(): Promise<AutomationSettings> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('automation_settings').select('*').limit(1).single();
        if (data) return data as AutomationSettings;
      } catch {}
    }
    return fileStorage.getAutomationSettings();
  },

  async saveAutomationSettings(settings: Partial<AutomationSettings>): Promise<AutomationSettings> {
    const current = fileStorage.getAutomationSettings();
    const updated: AutomationSettings = {
      ...current,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    fileStorage.saveAutomationSettings(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('automation_settings').upsert(updated);
      } catch {}
    }
    return updated;
  },

  // 7. Logs
  async getLogs(modulo?: string): Promise<SystemLog[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let q = supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100);
        if (modulo && modulo !== 'todos') q = q.eq('modulo', modulo);
        const { data } = await q;
        if (data && data.length > 0) return data as SystemLog[];
      } catch {}
    }

    const all = fileStorage.getLogs();
    return modulo && modulo !== 'todos' ? all.filter((l) => l.modulo === modulo) : all;
  },

  async addLog(log: Omit<SystemLog, 'id' | 'created_at'>): Promise<SystemLog> {
    const all = fileStorage.getLogs();
    const newLog: SystemLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    };
    all.unshift(newLog);
    // Limita aos últimos 200 logs
    if (all.length > 200) all.length = 200;
    fileStorage.saveLogs(all);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('system_logs').insert(newLog);
      } catch {}
    }
    return newLog;
  },
};
