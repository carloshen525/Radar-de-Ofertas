'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProductModal } from '@/components/ProductModal';
import {
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertCircle,
  Tag,
  Kanban,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Product, ShopeeAccountConfig } from '@/lib/types';

const categorias = [
  'Geral (Buscar de Tudo)',
  'Eletrônicos',
  'Casa',
  'Beleza',
  'Moda',
  'Games',
  'Ferramentas',
  'Celulares',
  'Informática',
];

export default function RadarPage() {
  const [categoria, setCategoria] = useState('Geral (Buscar de Tudo)');
  const [palavrasChave, setPalavrasChave] = useState('');
  const [descontoMinimo, setDescontoMinimo] = useState(15);
  const [avaliacaoMinima, setAvaliacaoMinima] = useState(4.0);
  const [vendasMinimas, setVendasMinimas] = useState(10);
  const [precoMinimo, setPrecoMinimo] = useState(0);
  const [precoMaximo, setPrecoMaximo] = useState(1500);
  const [limitePorBusca, setLimitePorBusca] = useState(20);

  const [shopeeConfig, setShopeeConfig] = useState<ShopeeAccountConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<any>(null);
  const [produtosEncontrados, setProdutosEncontrados] = useState<Product[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadInitialData = async () => {
    try {
      // 1. Carrega configuração da Shopee
      const configRes = await fetch('/api/shopee/config');
      const configData = await configRes.json();
      setShopeeConfig(configData);

      // 2. Carrega produtos existentes
      const prodsRes = await fetch('/api/offers?status=encontrado');
      const prodsData = await prodsRes.json();
      if (Array.isArray(prodsData)) {
        setProdutosEncontrados(prodsData);
      }

      // 3. Carrega status do worker em background
      const workerRes = await fetch('/api/automation/status');
      const workerData = await workerRes.json();
      setWorkerStatus(workerData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/radar/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: categoria.startsWith('Geral') ? 'Geral' : categoria,
          palavrasChave,
          descontoMinimo,
          avaliacaoMinima,
          vendasMinimas,
          precoMinimo,
          precoMaximo,
          limitePorBusca,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProdutosEncontrados(data.salvos || []);
        setFeedback({
          type: 'success',
          message: `Radar executado na Shopee oficial: ${data.salvos?.length || 0} produtos reais capturados e salvos!`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Erro desconhecido ao consultar a Shopee API.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha na comunicação: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoPilot = async () => {
    const action = workerStatus?.ativo ? 'stop' : 'start';
    try {
      const res = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setWorkerStatus(data.status);
    } catch (err) {
      console.error(err);
    }
  };

  const hasShopeeCredentials = Boolean(shopeeConfig?.appId);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Radar de Produtos Shopee"
        subtitle="Varredura oficial na Shopee Affiliate API para minerar ofertas comissionadas em tempo real"
        onRefresh={loadInitialData}
      />

      <div className="p-8 space-y-6">
        {/* Banner de Verificação da API Shopee */}
        {!hasShopeeCredentials ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Credenciais da Shopee não detectadas</h4>
                <p className="text-xs text-amber-800">
                  Para puxar produtos reais diretamente do catálogo oficial, configure seu <b>App ID</b> e <b>Secret Key</b>.
                </p>
              </div>
            </div>
            <Link
              href="/shopee"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 flex-shrink-0"
            >
              Configurar Shopee Agora <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Conectado à API Oficial Shopee
                </span>
                <span className="text-xs text-emerald-900 font-semibold">
                  App ID: {shopeeConfig?.appId} • Assinatura HMAC-SHA256 Ativa
                </span>
              </div>
            </div>

            {/* Status do Robô Automático */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-500 block font-medium">Piloto Automático em Background:</span>
                <span className="text-xs font-bold text-slate-700">
                  {workerStatus?.ativo ? '🟢 Minerando a cada 15 min' : '⚪ Pausado'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoPilot}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  workerStatus?.ativo
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {workerStatus?.ativo ? 'Robô Ativo' : 'Ativar Robô Automático'}
              </button>
            </div>
          </div>
        )}

        {/* Feedback de Erro ou Sucesso */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5 border shadow-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-bold">{feedback.type === 'success' ? 'Sucesso' : 'Atenção na API'}</p>
              <p className="mt-0.5 leading-relaxed">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Painel de Filtros e Busca */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-shopee flex items-center justify-center">
                <Radar className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Mineração em Tempo Real na Shopee</h3>
                <p className="text-xs text-slate-400">Busca ofertas reais diretamente no endpoint oficial da Shopee</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-shopee hover:bg-shopee-hover text-white rounded-xl text-xs font-bold shadow-md shadow-shopee/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Consultando Shopee API...' : 'Executar Radar na Shopee Agora'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Categoria */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Palavras-chave */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Palavra-chave (Opcional)
              </label>
              <input
                type="text"
                value={palavrasChave}
                onChange={(e) => setPalavrasChave(e.target.value)}
                placeholder="Ex: fone sem fio, smartwatch..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
            </div>

            {/* Desconto Mínimo */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Desconto Mínimo (%)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={descontoMinimo}
                onChange={(e) => setDescontoMinimo(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
            </div>

            {/* Avaliação Mínima */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Avaliação Mínima (⭐)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={avaliacaoMinima}
                onChange={(e) => setAvaliacaoMinima(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
            </div>

            {/* Vendas Mínimas */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Vendas Mínimas
              </label>
              <input
                type="number"
                min="0"
                value={vendasMinimas}
                onChange={(e) => setVendasMinimas(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
            </div>

            {/* Preço Máximo */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Preço Máximo (R$)
              </label>
              <input
                type="number"
                min="10"
                value={precoMaximo}
                onChange={(e) => setPrecoMaximo(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
            </div>

            {/* Quantidade por Busca */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Limite de Ofertas
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={limitePorBusca}
                onChange={(e) => setLimitePorBusca(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
            </div>
          </div>
        </form>

        {/* Resultados Encontrados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Oportunidades no Radar ({produtosEncontrados.length})
              </h3>
              <p className="text-xs text-slate-500">
                Produtos salvos e sincronizados com a esteira Kanban
              </p>
            </div>
            <Link
              href="/esteira"
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
            >
              Ir para Esteira Kanban <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {produtosEncontrados.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  <img
                    src={item.imagem}
                    alt={item.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {item.desconto > 0 && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded shadow">
                      -{item.desconto}% OFF
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    Score: {item.score} pts
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {item.categoria}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs line-clamp-2 mt-0.5 leading-snug">
                      {item.nome}
                    </h4>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-shopee">
                        R$ {item.preco.toFixed(2).replace('.', ',')}
                      </span>
                      {item.preco_antigo && (
                        <span className="text-[11px] line-through text-slate-400">
                          R$ {item.preco_antigo.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400" /> {item.avaliacao}
                      </span>
                      <span>{item.vendas.toLocaleString('pt-BR')} vendidos</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProduct(item)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Detalhes & Copy IA
                  </button>
                </div>
              </div>
            ))}

            {produtosEncontrados.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <Radar className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-bold text-slate-700">Nenhum produto minerado no radar ainda</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Clique em "Executar Radar na Shopee Agora" acima para que a API busque ofertas reais na categoria selecionada.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onUpdate={(updated) => {
          setProdutosEncontrados((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelectedProduct(updated);
        }}
      />
    </div>
  );
}
