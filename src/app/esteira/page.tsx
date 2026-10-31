'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { ProductModal } from '@/components/ProductModal';
import {
  Kanban,
  Sparkles,
  Send,
  Star,
  CheckCircle,
  XCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { Product, ProductStatus } from '@/lib/types';

const COLUNAS: { key: ProductStatus; label: string; color: string; badgeColor: string }[] = [
  { key: 'encontrado', label: 'Encontrados', color: 'border-slate-300', badgeColor: 'bg-slate-100 text-slate-700' },
  { key: 'analisando', label: 'Analisando', color: 'border-amber-300', badgeColor: 'bg-amber-100 text-amber-800' },
  { key: 'aprovado', label: 'Aprovados', color: 'border-blue-300', badgeColor: 'bg-blue-100 text-blue-800' },
  { key: 'agendado', label: 'Agendados', color: 'border-purple-300', badgeColor: 'bg-purple-100 text-purple-800' },
  { key: 'publicado', label: 'Publicados', color: 'border-emerald-300', badgeColor: 'bg-emerald-100 text-emerald-800' },
];

export default function EsteiraKanbanPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = filterCategory && filterCategory !== 'Todas'
        ? `/api/offers?categoria=${encodeURIComponent(filterCategory)}`
        : '/api/offers';
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterCategory]);

  const handleMoveStatus = async (id: string, newStatus: ProductStatus) => {
    try {
      await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/offers/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setFeedback('Produto removido da esteira!');
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async (statusFilter?: ProductStatus) => {
    try {
      const url = statusFilter ? `/api/offers?status=${statusFilter}` : '/api/offers';
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (statusFilter) {
        setProducts((prev) => prev.filter((p) => p.status !== statusFilter));
        setFeedback(`${data.removed || 0} produto(s) da coluna ${statusFilter} foram apagados!`);
      } else {
        setProducts([]);
        setFeedback('Todos os materiais pesquisados foram apagados com sucesso!');
      }
      setConfirmClearOpen(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback('Erro ao apagar produtos.');
    }
  };

  const categories = ['Todas', ...Array.from(new Set(products.map((p) => p.categoria).filter(Boolean)))];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Esteira de Ofertas (Kanban)"
        subtitle="Gerencie o ciclo de vida das oportunidades mineradas, aprove ou limpe os materiais"
        onRefresh={fetchProducts}
      />

      <div className="p-6 flex-1 flex flex-col space-y-4">
        {/* Barra de Ferramentas da Esteira */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Total na Esteira:
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-900 font-extrabold text-xs rounded-full border border-slate-200">
              {products.length} ofertas
            </span>

            {/* Filtro de Categoria */}
            {categories.length > 2 && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-shopee"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'Todas' ? 'Todas as Categorias' : c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Botão de Limpar Materiais */}
          <div className="flex items-center gap-2">
            {products.some((p) => p.status === 'encontrado') && (
              <button
                type="button"
                onClick={() => handleClearAll('encontrado')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                title="Limpar apenas os produtos da coluna Encontrados"
              >
                Limpar Apenas "Encontrados"
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              disabled={products.length === 0}
              className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Apagar Todos os Materiais
            </button>
          </div>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {feedback}
          </div>
        )}

        {/* Kanban Board Horizontal Scroll */}
        <div className="flex-1 flex gap-5 overflow-x-auto pb-6">
          {COLUNAS.map((col) => {
            const itensColuna = products.filter((p) => p.status === col.key);

            return (
              <div
                key={col.key}
                className="w-80 flex-shrink-0 flex flex-col bg-slate-100/70 rounded-2xl p-4 border border-slate-200"
              >
                {/* Coluna Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      {col.label}
                    </h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                      {itensColuna.length}
                    </span>
                  </div>

                  {itensColuna.length > 0 && (
                    <button
                      onClick={() => handleClearAll(col.key)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title={`Limpar todos de ${col.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {itensColuna.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group relative"
                      onClick={() => setSelectedProduct(prod)}
                    >
                      {/* Botão de Excluir Individual */}
                      <button
                        onClick={(e) => handleDeleteSingle(prod.id, e)}
                        className="absolute top-2.5 right-2.5 p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors z-10"
                        title="Apagar este produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex gap-3 pr-6">
                        <img
                          src={prod.imagem}
                          alt={prod.nome}
                          className="w-14 h-14 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {prod.categoria}
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug group-hover:text-shopee transition-colors">
                            {prod.nome}
                          </h4>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-sm font-black text-shopee">
                              R$ {prod.preco.toFixed(2).replace('.', ',')}
                            </span>
                            {prod.desconto > 0 && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">
                                -{prod.desconto}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" /> {prod.avaliacao}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-shopee rounded-full border border-orange-100">
                          Score: {prod.score}
                        </span>
                      </div>

                      {/* Ações Rápidas por Coluna */}
                      <div className="pt-2 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                        {col.key === 'encontrado' && (
                          <button
                            onClick={() => handleMoveStatus(prod.id, 'analisando')}
                            className="w-full py-1 text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            Analisar ➔
                          </button>
                        )}

                        {col.key === 'analisando' && (
                          <div className="w-full flex gap-1">
                            <button
                              onClick={() => handleMoveStatus(prod.id, 'aprovado')}
                              className="flex-1 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleMoveStatus(prod.id, 'rejeitado')}
                              className="py-1 px-2 text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {col.key === 'aprovado' && (
                          <div className="w-full flex gap-1">
                            <button
                              onClick={() => handleMoveStatus(prod.id, 'agendado')}
                              className="flex-1 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                            >
                              Agendar Fila
                            </button>
                            <button
                              onClick={() => setSelectedProduct(prod)}
                              className="py-1 px-2 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Publicar no Telegram"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {col.key === 'agendado' && (
                          <button
                            onClick={() => setSelectedProduct(prod)}
                            className="w-full py-1 text-[11px] font-bold bg-shopee text-white hover:bg-shopee-hover rounded-lg transition-colors shadow-sm"
                          >
                            Publicar Agora 🚀
                          </button>
                        )}

                        {col.key === 'publicado' && (
                          <span className="w-full py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg text-center flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Enviado ao Canal
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {itensColuna.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                      Nenhum produto nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Confirmação para Apagar Tudo */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">
                Apagar todos os materiais pesquisados?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta ação removerá todas as <b>{products.length} ofertas</b> atualmente na esteira Kanban. Os dados minerados serão excluídos permanentemente.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleClearAll()}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-600/20"
              >
                Sim, Apagar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onUpdate={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelectedProduct(updated);
        }}
        onDelete={(deletedId) => {
          setProducts((prev) => prev.filter((p) => p.id !== deletedId));
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}
