// Serviço de Persistência no Supabase (com Fallback Resiliente para Armazenamento Local)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProdutoShopee } from '@/services/shopee/ShopeeService';
import { fileStorage } from '@/lib/storage';
import path from 'path';
import fs from 'fs';

export interface ProdutoDB {
  id?: string;
  produto_id: string;
  titulo: string;
  descricao?: string | null;
  preco: number;
  preco_original?: number | null;
  link_afiliado: string;
  imagem?: string | null;
  categoria?: string | null;
  loja?: string | null;
  criado_em?: string;
  publicado: boolean;
  data_publicacao?: string | null;
  desconto?: number;
  avaliacao?: number;
  vendas?: number;
}

const LOCAL_PRODUTOS_FILE = path.join(process.cwd(), 'data', 'produtos_serverless.json');

export class SupabaseService {
  private client: SupabaseClient | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): SupabaseClient | null {
    if (this.client) return this.client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key && url.startsWith('http')) {
      try {
        this.client = createClient(url, key);
        return this.client;
      } catch (err) {
        console.warn('Falha ao instanciar cliente do Supabase:', err);
        return null;
      }
    }
    return null;
  }

  private readLocalProdutos(): ProdutoDB[] {
    try {
      if (!fs.existsSync(LOCAL_PRODUTOS_FILE)) {
        return [];
      }
      const raw = fs.readFileSync(LOCAL_PRODUTOS_FILE, 'utf-8');
      return JSON.parse(raw) as ProdutoDB[];
    } catch {
      return [];
    }
  }

  private writeLocalProdutos(produtos: ProdutoDB[]): void {
    try {
      const dir = path.dirname(LOCAL_PRODUTOS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LOCAL_PRODUTOS_FILE, JSON.stringify(produtos, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar produtos locais:', err);
    }
  }

  /**
   * Verifica se o produto_id já existe no banco (Supabase ou local)
   */
  async existeProduto(produtoId: string): Promise<boolean> {
    const supabase = this.initClient();
    if (supabase) {
      try {
        const { count, error } = await supabase
          .from('produtos')
          .select('produto_id', { count: 'exact', head: true })
          .eq('produto_id', produtoId);

        if (!error && count !== null) {
          return count > 0;
        }
      } catch {}
    }

    // Verificação local
    const locais = this.readLocalProdutos();
    return locais.some((p) => p.produto_id === produtoId);
  }

  /**
   * Salva os produtos na tabela `produtos`, ignorando duplicados
   */
  async salvarNovosProdutos(
    produtos: ProdutoShopee[]
  ): Promise<{ adicionados: number; existiam: number; produtosSalvos: ProdutoDB[] }> {
    let existiam = 0;
    let adicionados = 0;
    const produtosSalvos: ProdutoDB[] = [];

    const supabase = this.initClient();

    // 1. Carrega produtos existentes para verificar duplicidade
    for (const prod of produtos) {
      const jaExiste = await this.existeProduto(prod.produto_id);
      if (jaExiste) {
        existiam++;
        continue;
      }

      const novoProduto: ProdutoDB = {
        produto_id: prod.produto_id,
        titulo: prod.titulo,
        descricao: prod.descricao || null,
        preco: prod.preco,
        preco_original: prod.preco_original || prod.preco,
        link_afiliado: prod.link_afiliado,
        imagem: prod.imagem,
        categoria: prod.categoria,
        loja: prod.loja,
        criado_em: new Date().toISOString(),
        publicado: false,
        data_publicacao: null,
        desconto: prod.desconto,
        avaliacao: prod.avaliacao,
        vendas: prod.vendas,
      };

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('produtos')
            .insert({
              produto_id: novoProduto.produto_id,
              titulo: novoProduto.titulo,
              descricao: novoProduto.descricao,
              preco: novoProduto.preco,
              preco_original: novoProduto.preco_original,
              link_afiliado: novoProduto.link_afiliado,
              imagem: novoProduto.imagem,
              categoria: novoProduto.categoria,
              loja: novoProduto.loja,
              criado_em: novoProduto.criado_em,
              publicado: false,
              data_publicacao: null,
            })
            .select()
            .single();

          if (!error && data) {
            novoProduto.id = data.id;
          }
        } catch {}
      }

      // Salva no armazenamento local resiliente
      const locais = this.readLocalProdutos();
      if (!locais.some((p) => p.produto_id === novoProduto.produto_id)) {
        locais.push(novoProduto);
        this.writeLocalProdutos(locais);
      }

      // Sincroniza também com o armazenamento do dashboard existente
      const existingProds = fileStorage.getProducts();
      if (!existingProds.some((p) => p.external_item_id === novoProduto.produto_id)) {
        existingProds.push({
          id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          external_item_id: novoProduto.produto_id,
          marketplace: 'shopee',
          nome: novoProduto.titulo,
          imagem: novoProduto.imagem || '',
          preco: novoProduto.preco,
          preco_antigo: novoProduto.preco_original || novoProduto.preco,
          desconto: novoProduto.desconto || 0,
          avaliacao: novoProduto.avaliacao || 4.5,
          vendas: novoProduto.vendas || 0,
          categoria: novoProduto.categoria || 'Geral',
          loja: novoProduto.loja || 'Shopee',
          url_original: novoProduto.link_afiliado,
          url_afiliado: novoProduto.link_afiliado,
          score: 85,
          status: 'aprovado',
          created_at: novoProduto.criado_em || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        fileStorage.saveProducts(existingProds);
      }

      adicionados++;
      produtosSalvos.push(novoProduto);
    }

    return { adicionados, existiam, produtosSalvos };
  }

  /**
   * Busca apenas UM produto que ainda não foi publicado (publicado = false),
   * preferencialmente o mais antigo ainda não publicado.
   */
  async obterProximoNaoPublicado(): Promise<ProdutoDB | null> {
    const supabase = this.initClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('publicado', false)
          .order('criado_em', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return data as ProdutoDB;
        }
      } catch {}
    }

    // Busca no armazenamento local
    const locais = this.readLocalProdutos();
    const naoPublicados = locais
      .filter((p) => !p.publicado)
      .sort((a, b) => new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime());

    if (naoPublicados.length > 0) {
      return naoPublicados[0];
    }

    return null;
  }

  /**
   * Marca o produto como publicado no Supabase e no armazenamento
   */
  async marcarComoPublicado(produtoId: string): Promise<void> {
    const dataPublicacao = new Date().toISOString();
    const supabase = this.initClient();

    if (supabase) {
      try {
        await supabase
          .from('produtos')
          .update({
            publicado: true,
            data_publicacao: dataPublicacao,
          })
          .eq('produto_id', produtoId);
      } catch {}
    }

    // Atualiza localmente
    const locais = this.readLocalProdutos();
    const idx = locais.findIndex((p) => p.produto_id === produtoId);
    if (idx !== -1) {
      locais[idx].publicado = true;
      locais[idx].data_publicacao = dataPublicacao;
      this.writeLocalProdutos(locais);
    }

    // Atualiza no banco geral
    const existingProds = fileStorage.getProducts();
    const pIdx = existingProds.findIndex((p) => p.external_item_id === produtoId);
    if (pIdx !== -1) {
      existingProds[pIdx].status = 'publicado';
      existingProds[pIdx].updated_at = dataPublicacao;
      fileStorage.saveProducts(existingProds);
    }
  }
}

export const defaultSupabaseService = new SupabaseService();

