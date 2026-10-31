'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import {
  X,
  Sparkles,
  Send,
  ExternalLink,
  CheckCircle,
  XCircle,
  Copy,
  Tag,
  Star,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onUpdate: (updated: Product) => void;
  onDelete?: (id: string) => void;
}

export function ProductModal({ product, onClose, onUpdate, onDelete }: ProductModalProps) {
  if (!product) return null;

  const [copy, setCopy] = useState(product.legenda_ia || '');
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleGenerateCopy = async () => {
    setGeneratingCopy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/offers/${product.id}/generate-copy`, { method: 'POST' });
      const data = await res.json();
      if (data.copy) {
        setCopy(data.copy);
        onUpdate({ ...product, legenda_ia: data.copy });
        setFeedback('Legenda gerada com sucesso pela IA!');
      }
    } catch {
      setFeedback('Falha ao gerar copy.');
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleSaveCopy = async () => {
    try {
      await fetch(`/api/offers/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legenda_ia: copy }),
      });
      onUpdate({ ...product, legenda_ia: copy });
      setFeedback('Legenda salva com sucesso!');
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('Erro ao salvar.');
    }
  };

  const handlePublishNow = async () => {
    setPublishing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/offers/${product.id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onUpdate({ ...product, status: 'publicado', legenda_ia: copy });
        setFeedback('Oferta publicada no Telegram!');
        setTimeout(() => onClose(), 1500);
      } else {
        setFeedback(`Erro ao publicar: ${data.error || 'Verifique o bot'}`);
      }
    } catch (err: any) {
      setFeedback(`Erro: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateStatus = async (newStatus: Product['status']) => {
    try {
      await fetch(`/api/offers/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onUpdate({ ...product, status: newStatus });
      onClose();
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('Deseja realmente apagar este produto da esteira?')) return;
    try {
      await fetch(`/api/offers/${product.id}`, { method: 'DELETE' });
      if (onDelete) onDelete(product.id);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-orange-50 text-shopee font-semibold text-xs rounded-full border border-orange-100">
              Score: {product.score} pts
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {product.categoria} • {product.loja || 'Shopee'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Apagar produto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Lado Esquerdo: Produto e Preview Telegram */}
          <div className="space-y-4">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={product.imagem}
                alt={product.nome}
                className="w-full h-full object-cover"
              />
              {product.desconto > 0 && (
                <span className="absolute top-3 right-3 bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-md">
                  -{product.desconto}% OFF
                </span>
              )}
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base leading-snug">{product.nome}</h3>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl font-black text-shopee">
                  R$ {product.preco.toFixed(2).replace('.', ',')}
                </span>
                {product.preco_antigo && (
                  <span className="text-sm line-through text-slate-400">
                    R$ {product.preco_antigo.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {product.avaliacao}
                </span>
                <span>• {product.vendas.toLocaleString('pt-BR')} vendas</span>
              </div>
            </div>

            {/* Links */}
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={product.url_afiliado || product.url_original}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-shopee" />
                  Link Oficial Afiliado Shopee
                </span>
                <span className="text-shopee">Abrir ↗</span>
              </a>
            </div>
          </div>

          {/* Lado Direito: Editor de Copy IA & Mock Telegram */}
          <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Legenda para Telegram
              </label>
              <button
                onClick={handleGenerateCopy}
                disabled={generatingCopy}
                className="text-xs font-semibold text-shopee hover:text-shopee-hover flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generatingCopy ? 'Gerando com IA...' : 'Gerar novamente com IA'}
              </button>
            </div>

            <textarea
              rows={9}
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Clique em 'Gerar com IA' para criar a copy ou digite aqui..."
              className="w-full text-xs font-mono p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none resize-none leading-relaxed text-slate-800 bg-slate-50/50"
            />

            {feedback && (
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {feedback}
              </p>
            )}

            {/* Simulação Visual do Botão Telegram */}
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">
                Pré-visualização do Botão Inline no Telegram
              </span>
              <button className="w-full py-2 bg-sky-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 pointer-events-none">
                🛒 Comprar agora
              </button>
            </div>

            {/* Ações */}
            <div className="pt-4 mt-auto border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus('aprovado')}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                </button>
                <button
                  onClick={() => handleUpdateStatus('rejeitado')}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reprovar
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveCopy}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Salvar Texto
                </button>
                <button
                  onClick={handlePublishNow}
                  disabled={publishing}
                  className="px-4 py-1.5 bg-shopee hover:bg-shopee-hover text-white rounded-lg text-xs font-bold shadow-md shadow-shopee/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {publishing ? 'Enviando...' : 'Publicar no Telegram'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
