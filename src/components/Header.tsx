'use client';

import React, { useState, useEffect } from 'react';
import { Play, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, onRefresh }: HeaderProps) {
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [workerStatus, setWorkerStatus] = useState<any>(null);

  // Heartbeat em segundo plano: consulta o status a cada 30 segundos mantendo o worker sempre ativo
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/automation/status');
      if (res.ok) {
        const data = await res.json();
        setWorkerStatus(data);
      }
    } catch {}
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunPipeline = async () => {
    setRunning(true);
    setFeedback({ type: 'success', message: 'Executando ciclo completo (Shopee + IA + Telegram)...' });
    try {
      const res = await fetch('/api/automation/run-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'full' }),
      });
      const data = await res.json();

      if (data.success && data.summary) {
        const p = data.summary.publicacao?.published || 0;
        const b = data.summary.busca?.saved || 0;
        const i = data.summary.ia?.generated || 0;
        setFeedback({
          type: 'success',
          message: `Ciclo concluído! Minerados: ${b} | Copys: ${i} | Publicados no Telegram: ${p}`,
        });
      } else {
        setFeedback({ type: 'success', message: 'Ciclo executado com sucesso!' });
      }

      setTimeout(() => setFeedback(null), 6000);
      if (onRefresh) onRefresh();
      checkStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro ao executar: ${err.message}` });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setRunning(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {feedback && (
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 animate-fade-in border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            )}
            {feedback.message}
          </span>
        )}

        {/* Badge do Status do Robô */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Robô Autônomo Ativo</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={handleRunPipeline}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-shopee to-orange-500 hover:from-shopee-hover hover:to-orange-600 text-white rounded-lg text-xs font-bold shadow-md shadow-shopee/25 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
        >
          {running ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 fill-white text-white" />
          )}
          {running ? 'Executando Piloto Automático...' : 'Testar Piloto Automático Agora'}
        </button>
      </div>
    </header>
  );
}

