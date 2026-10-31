'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Filter,
  Send,
  Eye,
} from 'lucide-react';
import { Publication } from '@/lib/types';

export default function HistoricoPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'todos' ? '/api/publications' : `/api/publications?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setPublications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, [statusFilter]);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Histórico de Publicações"
        subtitle="Rastreabilidade e auditoria de todas as ofertas transmitidas para os canais"
        onRefresh={fetchPublications}
      />

      <div className="p-8 space-y-6">
        {/* Barra de Filtros Solicitados */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrar por Status:</span>
          </div>

          <div className="flex gap-2">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'publicado', label: 'Publicado' },
              { key: 'agendado', label: 'Agendado' },
              { key: 'erro', label: 'Erro' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === f.key
                    ? 'bg-shopee text-white shadow-sm shadow-shopee/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Histórico */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Produto</th>
                  <th className="py-3 px-4">Canal Destino</th>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Link de Afiliado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {publications.map((pub) => {
                  const prod = pub.product;
                  return (
                    <tr key={pub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {prod?.imagem ? (
                            <img
                              src={prod.imagem}
                              alt={prod.nome}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              📦
                            </div>
                          )}
                          <div className="max-w-xs">
                            <p className="font-semibold text-slate-900 truncate">
                              {prod?.nome || 'Produto ID: ' + pub.product_id}
                            </p>
                            {prod?.preco && (
                              <span className="text-[11px] font-bold text-shopee">
                                R$ {prod.preco.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-medium text-slate-700">
                        {pub.telegram_channel}
                      </td>

                      <td className="py-4 px-4 text-slate-500">
                        {new Date(pub.published_at).toLocaleString('pt-BR')}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 w-fit capitalize ${
                            pub.status === 'publicado'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : pub.status === 'agendado'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {pub.status === 'publicado' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {pub.status === 'agendado' && <Clock className="w-3 h-3 text-purple-600" />}
                          {pub.status === 'erro' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {pub.status}
                        </span>
                        {pub.mensagem_erro && (
                          <span className="text-[10px] text-rose-500 block mt-1">
                            {pub.mensagem_erro}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        {prod?.url_afiliado || prod?.url_original ? (
                          <a
                            href={prod.url_afiliado || prod.url_original}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                          >
                            Abrir Oferta <ExternalLink className="w-3 h-3 text-shopee" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {publications.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      Nenhuma publicação encontrada para o filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

