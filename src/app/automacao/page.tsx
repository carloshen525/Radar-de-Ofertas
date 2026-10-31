'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import {
  Zap,
  Play,
  Clock,
  Calendar,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Search,
  Sparkles,
  Send,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { AutomationSettings } from '@/lib/types';

const HORARIOS_PADRAO = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

export default function AutomacaoPage() {
  const [settings, setSettings] = useState<AutomationSettings>({
    ativo: true,
    quantidade_diaria: 20,
    intervalo_minutos: 15,
    horarios_disparo: HORARIOS_PADRAO,
    auto_aprovar_score_minimo: 70.0,
    auto_gerar_copys_ia: true,
    auto_publicar: true,
  });

  const [workerStatus, setWorkerStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchStatusAndSettings = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([
        fetch('/api/automation/settings'),
        fetch('/api/automation/status'),
      ]);
      const settingsData = await settingsRes.json();
      const statusData = await statusRes.json();
      if (settingsData) setSettings(settingsData);
      if (statusData) setWorkerStatus(statusData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatusAndSettings();
    const interval = setInterval(fetchStatusAndSettings, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleWorker = async () => {
    const action = workerStatus?.ativo ? 'stop' : 'start';
    try {
      const res = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, intervalMinutes: settings.intervalo_minutos || 15 }),
      });
      const data = await res.json();
      setWorkerStatus(data.status);
      setSettings((prev) => ({ ...prev, ativo: action === 'start' }));
      setFeedback(action === 'start' ? 'Robô de background ativado!' : 'Robô de background pausado.');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback('Falha ao alternar estado do robô.');
    }
  };

  const handleTriggerNow = async () => {
    setRunningJob('trigger_now');
    setFeedback('Executando ciclo completo de mineração agora...');
    try {
      const res = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_now' }),
      });
      const data = await res.json();
      setWorkerStatus(data.status);
      setFeedback(data.resumo || 'Ciclo concluído com sucesso!');
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback('Erro ao disparar ciclo.');
    } finally {
      setRunningJob(null);
    }
  };

  const handleRunJob = async (jobId: string, jobLabel: string) => {
    setRunningJob(jobId);
    setFeedback(`Executando ${jobLabel}...`);
    try {
      const res = await fetch('/api/automation/run-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: jobId }),
      });
      const data = await res.json();
      setFeedback(`${jobLabel} finalizado com sucesso!`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback(`Erro ao executar ${jobLabel}.`);
    } finally {
      setRunningJob(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      setSettings(data);
      setFeedback('Configurações salvas!');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Automação & Robô em Background"
        subtitle="Gerenciamento da esteira contínua que puxa produtos automaticamente da Shopee"
        onRefresh={fetchStatusAndSettings}
      />

      <div className="p-8 max-w-5xl space-y-8">
        {feedback && (
          <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {feedback}
          </div>
        )}

        {/* 1. Card de Status do Robô Automático em Background */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white border border-slate-700 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    workerStatus?.ativo ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                ></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {workerStatus?.ativo ? 'Robô Rodando em Background' : 'Robô Pausado'}
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Mineração e Publicação Automática Sozinha
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Quando ativo, o sistema consulta a API oficial da Shopee sozinho em ciclos periódicos, analisa oportunidades, gera cópias com IA e envia ao Telegram.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTriggerNow}
                disabled={Boolean(runningJob)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningJob === 'trigger_now' ? 'animate-spin' : ''}`} />
                {runningJob === 'trigger_now' ? 'Minerando...' : 'Rodar Ciclo Agora'}
              </button>

              <button
                type="button"
                onClick={handleToggleWorker}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                  workerStatus?.ativo
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                }`}
              >
                {workerStatus?.ativo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {workerStatus?.ativo ? 'Pausar Robô' : 'Ativar Robô Automático'}
              </button>
            </div>
          </div>

          {/* Métricas do Robô */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-700/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Intervalo entre Ciclos</span>
              <span className="font-bold text-slate-100">A cada {settings.intervalo_minutos || 15} minutos</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Última Execução</span>
              <span className="font-bold text-slate-100">
                {workerStatus?.ultimoCicloEm ? new Date(workerStatus.ultimoCicloEm).toLocaleTimeString('pt-BR') : 'Aguardando'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Próxima Execução</span>
              <span className="font-bold text-slate-100">
                {workerStatus?.proximoCicloEm ? new Date(workerStatus.proximoCicloEm).toLocaleTimeString('pt-BR') : 'Pausado'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Ciclos Concluídos</span>
              <span className="font-bold text-emerald-400">{workerStatus?.totalCiclosExecutados || 0} execuções</span>
            </div>
          </div>

          {workerStatus?.ultimoResultado && (
            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700 text-[11px] text-slate-300">
              <span className="font-bold text-slate-200">Último resultado:</span> {workerStatus.ultimoResultado}
            </div>
          )}
        </div>

        {/* 2. Execução Sob Demanda dos 5 Jobs Internos */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Executar Jobs Isolados Manualmente</h3>
            <p className="text-xs text-slate-400">Você pode rodar cada etapa separadamente para depuração</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-bold text-shopee uppercase">Job 1</span>
                <h4 className="font-bold text-slate-900 text-xs mt-0.5">Buscar Produtos Shopee</h4>
                <p className="text-[11px] text-slate-500 mt-1">Busca ofertas reais na Shopee Affiliate API.</p>
              </div>
              <button
                onClick={() => handleRunJob('search', 'Job 1: Busca Shopee')}
                disabled={Boolean(runningJob)}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5 text-shopee" />
                {runningJob === 'search' ? 'Executando...' : 'Executar Job 1'}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase">Job 2</span>
                <h4 className="font-bold text-slate-900 text-xs mt-0.5">Analisar & Pontuar</h4>
                <p className="text-[11px] text-slate-500 mt-1">Calcula o score de oportunidade (0-100).</p>
              </div>
              <button
                onClick={() => handleRunJob('analyze', 'Job 2: Análise')}
                disabled={Boolean(runningJob)}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                {runningJob === 'analyze' ? 'Executando...' : 'Executar Job 2'}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase">Job 3</span>
                <h4 className="font-bold text-slate-900 text-xs mt-0.5">Gerar Copys com IA</h4>
                <p className="text-[11px] text-slate-500 mt-1">Escreve copys persuasivas para o Telegram.</p>
              </div>
              <button
                onClick={() => handleRunJob('ai', 'Job 3: IA')}
                disabled={Boolean(runningJob)}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                {runningJob === 'ai' ? 'Executando...' : 'Executar Job 3'}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-bold text-sky-600 uppercase">Job 4</span>
                <h4 className="font-bold text-slate-900 text-xs mt-0.5">Publicar no Telegram</h4>
                <p className="text-[11px] text-slate-500 mt-1">Dispara para os canais cadastrados com foto e botão.</p>
              </div>
              <button
                onClick={() => handleRunJob('publish', 'Job 4: Telegram')}
                disabled={Boolean(runningJob)}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-sky-500" />
                {runningJob === 'publish' ? 'Executando...' : 'Executar Job 4'}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Job 5</span>
                <h4 className="font-bold text-slate-900 text-xs mt-0.5">Relatório Diário</h4>
                <p className="text-[11px] text-slate-500 mt-1">Gera auditoria e métricas das ofertas.</p>
              </div>
              <button
                onClick={() => handleRunJob('report', 'Job 5: Relatórios')}
                disabled={Boolean(runningJob)}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                {runningJob === 'report' ? 'Executando...' : 'Executar Job 5'}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Parâmetros de Configuração */}
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Configurações de Intervalo e Metas</h3>
            <p className="text-xs text-slate-400">Ajuste o ritmo de postagem automática</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Intervalo do Robô (Minutos)
              </label>
              <input
                type="number"
                min="5"
                max="180"
                value={settings.intervalo_minutos || 15}
                onChange={(e) => setSettings({ ...settings, intervalo_minutos: Number(e.target.value) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tempo de espera entre cada varredura automática (Padrão: 15 min)
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Score Mínimo para Aprovação Automática
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.auto_aprovar_score_minimo}
                onChange={(e) => setSettings({ ...settings, auto_aprovar_score_minimo: Number(e.target.value) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-shopee outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Produtos com nota maior ou igual são aprovados sem intervenção manual
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-shopee hover:bg-shopee-hover text-white rounded-xl text-xs font-bold shadow-md shadow-shopee/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Parâmetros'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
