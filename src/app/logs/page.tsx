'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Filter,
  RefreshCw,
  ShoppingBag,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SystemLog } from '@/lib/types';

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [moduloFilter, setModuloFilter] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = moduloFilter === 'todos' ? '/api/logs' : `/api/logs?modulo=${moduloFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduloFilter]);

  const getModuloIcon = (modulo: string) => {
    switch (modulo) {
      case 'shopee':
        return <ShoppingBag className="w-3.5 h-3.5 text-shopee" />;
      case 'telegram':
        return <Send className="w-3.5 h-3.5 text-sky-500" />;
      case 'ia':
        return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
      case 'automacao':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Central de Logs & Diagnóstico"
        subtitle="Auditoria detalhada de operações da API Shopee, Telegram, Inteligência Artificial e Robôs"
        onRefresh={fetchLogs}
      />

      <div className="p-8 space-y-6">
        {/* Barra de Filtros Solicitados */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Módulos:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todos', label: 'Todos os Módulos' },
              { key: 'shopee', label: 'API Shopee' },
              { key: 'telegram', label: 'Telegram' },
              { key: 'ia', label: 'IA Copys' },
              { key: 'automacao', label: 'Automação' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setModuloFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  moduloFilter === f.key
                    ? 'bg-shopee text-white shadow-sm shadow-shopee/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Data e Hora</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6">Mensagem / Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold uppercase tracking-wider">
                        {getModuloIcon(log.modulo)}
                        {log.modulo}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                      {log.evento}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit capitalize ${
                          log.status === 'sucesso'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.status === 'alerta'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {log.status === 'sucesso' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {log.status === 'alerta' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {log.status === 'erro' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                        {log.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 font-sans text-slate-700 text-xs leading-relaxed">
                      {log.mensagem}
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-sans">
                      Nenhum log registrado para este módulo.
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

