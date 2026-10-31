'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import {
  ShoppingBag,
  ShieldCheck,
  Key,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Check,
} from 'lucide-react';

export default function ShopeeConfigPage() {
  const [appId, setAppId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [status, setStatus] = useState<string>('inativo');
  const [mensagemStatus, setMensagemStatus] = useState<string>('');
  const [ultimoTesteEm, setUltimoTesteEm] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/shopee/config');
      const data = await res.json();
      if (data) {
        setAppId(data.appId || '');
        setHasSecretKey(Boolean(data.hasSecretKey));
        setStatus(data.status || 'inativo');
        setMensagemStatus(data.mensagemStatus || '');
        setUltimoTesteEm(data.ultimoTesteEm || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/shopee/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, secretKey, accessToken }),
      });
      const data = await res.json();

      if (data.success) {
        setSecretKey('');
        setFeedback({
          type: 'success',
          message: 'Credenciais da Shopee salvas com sucesso em disco e banco!',
        });
        fetchConfig();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao salvar.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/shopee/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, secretKey }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        fetchConfig();
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Falha na requisição: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Configuração Shopee"
        subtitle="Gerenciamento de credenciais oficiais da Shopee Affiliate Open Platform"
        onRefresh={fetchConfig}
      />

      <div className="p-8 max-w-4xl space-y-6">
        {/* Banner Informativo */}
        <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-6 text-orange-950 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-shopee text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-shopee/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-orange-900">
              Conexão com a Shopee Affiliate Open API (GraphQL)
            </h4>
            <p className="text-xs text-orange-800/90 leading-relaxed">
              O sistema utiliza a API oficial de afiliados da Shopee com criptografia de assinatura SHA-256.
              Sem scraping, sem bloqueios e com links rastreáveis de afiliados gerados automaticamente.
            </p>
          </div>
        </div>

        {/* Formulário Principal */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Credenciais da Aplicação</h3>
              <p className="text-xs text-slate-500">
                Insira as chaves obtidas no console de desenvolvedores de afiliados da Shopee
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 capitalize ${
                  status === 'ativo'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {status === 'ativo' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                Status: {status}
              </span>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            {/* App ID */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" /> App ID da Shopee
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="Ex: 17000000000"
                className="w-full text-xs font-mono p-3 bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none text-slate-900"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Identificador público da sua aplicação na Shopee Open Platform
              </span>
            </div>

            {/* Secret Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Secret Key (Chave Secreta)
                </label>
                {hasSecretKey && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Chave salva e ativa
                  </span>
                )}
              </div>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={hasSecretKey ? '•••••••••••••••• (deixe vazio para manter a atual)' : 'Insira sua Secret Key da Shopee'}
                className="w-full text-xs font-mono p-3 bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none text-slate-900"
                required={!hasSecretKey}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Utilizada para assinar criptograficamente cada requisição via SHA-256
              </span>
            </div>

            {/* Diagnóstico */}
            {mensagemStatus && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <p>
                  <span className="font-bold text-slate-800">Diagnóstico da Conexão:</span> {mensagemStatus}
                </p>
                {ultimoTesteEm && (
                  <span className="text-[11px] text-slate-400 block">
                    Último teste: {new Date(ultimoTesteEm).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <a
                href="https://affiliate.shopee.com.br/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                Abrir Portal Shopee Affiliate <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || (!appId && !hasSecretKey)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testando Conexão...' : 'Testar Conexão Oficial'}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-shopee hover:bg-shopee-hover text-white rounded-xl text-xs font-bold shadow-md shadow-shopee/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
