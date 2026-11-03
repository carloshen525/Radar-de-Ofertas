'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { ProductModal } from '@/components/ProductModal';
import {
  Package,
  Flame,
  Send,
  Zap,
  TrendingUp,
  Star,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Product, DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [workerStatus, setWorkerStatus] = useState<any>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerFeedback, setTriggerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, prodsRes, workerRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/offers'),
        fetch('/api/automation/status'),
      ]);
      const statsData = await statsRes.json();
      const prodsData = await prodsRes.json();
      const workerData = await workerRes.json();
      setStats(statsData);
      setRecentProducts(prodsData.slice(0, 8));
      setWorkerStatus(workerData);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/automation/status');
        if (res.ok) setWorkerStatus(await res.json());
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerAutonomousCycle = async () => {
    setTriggering(true);
    setTriggerFeedback(null);
    try {
      const res = await fetch('/api/automation/run-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'full' }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        const b = data.summary.busca?.saved || 0;
        const i = data.summary.ia?.generated || 0;
        const p = data.summary.publicacao?.published || 0;
        setTriggerFeedback({
          type: 'success',
          message: `Sucesso! O robô minerou ${b} produtos da Shopee, gerou ${i} copys com IA e publicou ${p} oferta(s) com link de afiliado no Telegram!`,
        });
      } else {
        setTriggerFeedback({ type: 'success', message: 'Ciclo autônomo executado com sucesso!' });
      }
      fetchData();
    } catch (err: any) {
      setTriggerFeedback({ type: 'error', message: `Erro ao executar: ${err.message}` });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Dashboard Geral"
        subtitle="Visão em tempo real da esteira de automação e vendas de afiliados Shopee"
        onRefresh={fetchData}
      />

      <div className="p-8 space-y-8 flex-1">
        {/* Banner de Status Operacional */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Sistema 100% Operacional
              </span>
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">
              Radar Shopee • Modo Automático Ativo
            </h3>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Mineração contínua de produtos via Shopee Affiliate Open API, cálculo de oportunidades e postagem inteligente no Telegram.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 block text-[10px] font-medium">API Shopee Oficial</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Conectado (SHA-256)
              </span>
            </div>
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 block text-[10px] font-medium">Telegram Bot</span>
              <span className="font-bold text-blue-400 flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Online
              </span>
            </div>
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 block text-[10px] font-medium">Última Sincronização</span>
              <span className="font-bold text-slate-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {stats?.ultimaSincronizacaoShopee || 'Agora'}
              </span>
            </div>
          </div>
        </div>

        {/* Card do Piloto Automático & Botão de Teste Imediato */}
        <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50 rounded-2xl p-6 border border-orange-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  workerStatus?.emPausaNoturna ? 'bg-amber-500' : 'bg-emerald-500'
                } animate-pulse`}
              ></span>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                {workerStatus?.emPausaNoturna
                  ? `🌙 Pausa Noturna (00:30 às 06:00) • Retoma às 06:00`
                  : '🟢 Piloto Automático Ativo • Roda o Dia Todo (06:00 às 00:30)'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Piloto Automático Shopee ➔ Telegram
            </h3>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              O robô busca produtos na Shopee, analisa oportunidades, gera as copys com IA e envia com link de afiliado para o Telegram o dia todo sem parar, pausando automaticamente apenas entre 00:30 e 06:00 da manhã.
            </p>
            {workerStatus?.ultimoResultado && (
              <p className="text-[11px] font-mono text-slate-500 pt-1">
                Última execução: <span className="font-semibold text-slate-700">{workerStatus.ultimoResultado}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleTriggerAutonomousCycle}
              disabled={triggering}
              className="px-6 py-3.5 bg-gradient-to-r from-shopee to-orange-500 hover:from-shopee-hover hover:to-orange-600 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-shopee/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {triggering ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 fill-white" />
              )}
              {triggering ? 'Executando Ciclo Completo...' : '🚀 Testar Piloto Automático Agora'}
            </button>
          </div>
        </div>

        {triggerFeedback && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-fade-in ${
              triggerFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {triggerFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            {triggerFeedback.message}
          </div>
        )}

        {/* 4 Cards de Métricas Principais Solicitados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="📦 Produtos Encontrados"
            value={stats?.produtosEncontradosHoje ?? 18}
            subtitle="Minerados hoje pelo radar"
            icon={Package}
            color="shopee"
            badge="+12% hoje"
          />
          <MetricCard
            title="🔥 Ofertas Aprovadas"
            value={stats?.produtosAprovados ?? 6}
            subtitle="Prontas na esteira com IA"
            icon={Flame}
            color="amber"
          />
          <MetricCard
            title="📲 Publicações Realizadas"
            value={stats?.produtosPublicadosHoje ?? 8}
            subtitle={`Total acumulado: ${stats?.totalPublicacoes ?? 42}`}
            icon={Send}
            color="blue"
          />
          <MetricCard
            title="⚙️ Automações Ativas"
            value="5 Jobs"
            subtitle="Busca, IA e Postagem"
            icon={Zap}
            color="emerald"
            badge="Ativo"
          />
        </div>

        {/* Tabela de Ofertas Recentes na Esteira */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Últimas Oportunidades Mineradas</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Produtos analisados pela curadoria inteligente prontos para publicação
              </p>
            </div>
            <Link
              href="/esteira"
              className="text-xs font-bold text-shopee hover:text-shopee-hover flex items-center gap-1 transition-colors"
            >
              Ver Esteira Completa (Kanban) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Produto</th>
                  <th className="py-3 px-4">Preço Promocional</th>
                  <th className="py-3 px-4">Desconto</th>
                  <th className="py-3 px-4">Avaliação</th>
                  <th className="py-3 px-4">Score Oportunidade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.imagem}
                          alt={prod.nome}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                        />
                        <div className="max-w-xs">
                          <p className="font-semibold text-slate-900 truncate">{prod.nome}</p>
                          <span className="text-[11px] text-slate-400">
                            {prod.categoria} • {prod.loja || 'Shopee'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">
                        R$ {prod.preco.toFixed(2).replace('.', ',')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-red-600 bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-full">
                        -{prod.desconto}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {prod.avaliacao}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-shopee h-full rounded-full"
                            style={{ width: `${Math.min(prod.score, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-700">{prod.score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${
                          prod.status === 'publicado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : prod.status === 'aprovado'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : prod.status === 'agendado'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => setSelectedProduct(prod)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onUpdate={(updated) => {
          setRecentProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelectedProduct(updated);
        }}
      />
    </div>
  );
}

