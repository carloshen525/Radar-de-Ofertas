'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import {
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Save,
  Info,
} from 'lucide-react';
import { TelegramChannel } from '@/lib/types';

export default function TelegramPage() {
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [botToken, setBotToken] = useState('');
  const [nomeCanal, setNomeCanal] = useState('');
  const [chatId, setChatId] = useState('');
  const [tipo, setTipo] = useState<'canal' | 'grupo' | 'admin'>('canal');

  const [loading, setLoading] = useState(false);
  const [savingToken, setSavingToken] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadInitialData = async () => {
    try {
      const [chanRes, tokenRes] = await Promise.all([
        fetch('/api/telegram/channels'),
        fetch('/api/telegram/test'),
      ]);
      const chanData = await chanRes.json();
      if (Array.isArray(chanData)) setChannels(chanData);

      const tokenData = await tokenRes.json();
      if (tokenData.botToken) {
        setBotToken(tokenData.botToken);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSaveToken = async () => {
    if (!botToken.trim()) {
      setFeedback({ type: 'error', message: 'Insira o token do bot antes de salvar.' });
      return;
    }
    setSavingToken(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_token', token: botToken }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Token do Telegram salvo com sucesso!' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao salvar token' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingToken(false);
    }
  };

  const handleTestBot = async () => {
    setTestingBot(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_bot', token: botToken }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setTestingBot(false);
    }
  };

  const handleChatIdInput = (val: string) => {
    let clean = val.trim();
    if (clean.includes('t.me/')) {
      clean = clean.split('t.me/')[1].split('/')[0].split('?')[0].replace('+', '');
      if (!clean.startsWith('@') && !/^-?\d+$/.test(clean)) {
        clean = `@${clean}`;
      }
    }
    setChatId(clean);
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      let cleanChat = chatId.trim();
      if (cleanChat.includes('t.me/')) {
        cleanChat = cleanChat.split('t.me/')[1].split('/')[0].split('?')[0].replace('+', '');
      }
      if (cleanChat && !cleanChat.startsWith('@') && !/^-?\d+$/.test(cleanChat)) {
        cleanChat = `@${cleanChat}`;
      }

      const res = await fetch('/api/telegram/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeCanal, chat_id: cleanChat, tipo, ativo: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setNomeCanal('');
        setChatId('');
        setFeedback({ type: 'success', message: `Destino ${cleanChat} adicionado com sucesso!` });
        loadInitialData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao adicionar' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Deseja realmente remover este destino?')) return;
    try {
      await fetch(`/api/telegram/channels?id=${id}`, { method: 'DELETE' });
      loadInitialData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestChannel = async (targetChatId: string) => {
    setTestingChannelId(targetChatId);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_message', chatId: targetChatId, token: botToken }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setTestingChannelId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Telegram & Destinos"
        subtitle="Gerenciamento de bots, canais e grupos para postagem automática das ofertas"
        onRefresh={loadInitialData}
      />

      <div className="p-8 max-w-5xl space-y-8">
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2 border leading-relaxed ${
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
            <div className="flex-1 whitespace-pre-line">{feedback.message}</div>
          </div>
        )}

        {/* 1. Configuração do Bot Token */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Bot Oficial do Telegram</h3>
              <p className="text-xs text-slate-400">Token gerado pelo @BotFather para postagens automáticas</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToken}
                disabled={savingToken}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {savingToken ? 'Salvando...' : 'Salvar Token'}
              </button>
              <button
                onClick={handleTestBot}
                disabled={testingBot}
                className="px-4 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingBot ? 'animate-spin' : ''}`} />
                {testingBot ? 'Validando...' : 'Testar & Conectar'}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Ex: 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              className="flex-1 text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none"
            />
          </div>
          <span className="text-[11px] text-slate-400 block">
            💡 Dica: Salve o token para que a automação em segundo plano possa postar no Telegram automaticamente.
          </span>
        </div>

        {/* Alerta de Configuração do Chat */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Como evitar o erro "Bad Request: chat not found" no Telegram:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-amber-800 ml-1 leading-relaxed">
            <li>
              <b>Adicione o seu Bot ao Canal ou Grupo:</b> Abra seu canal no Telegram, vá em Informações &gt; Administradores &gt; <b>Adicionar Administrador</b> e busque pelo nome do seu bot.
            </li>
            <li>
              <b>Dê permissão de envio:</b> Certifique-se de que a opção de <i>"Publicar mensagens"</i> (Post Messages) está marcada para o bot.
            </li>
            <li>
              <b>Formato correto do Chat ID:</b> Use o username com @ (ex: <code>@radarsshopee</code>) ou o ID numérico (ex: <code>-1001234567890</code>). <u>Não use links no formato <code>https://t.me/...</code></u>.
            </li>
          </ol>
        </div>

        {/* 2. Formulário de Novo Canal/Grupo */}
        <form onSubmit={handleAddChannel} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Cadastrar Canal ou Grupo de Destino</h3>
            <p className="text-xs text-slate-400">Onde as ofertas e copys de afiliados serão publicadas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Nome do Canal/Grupo
              </label>
              <input
                type="text"
                value={nomeCanal}
                onChange={(e) => setNomeCanal(e.target.value)}
                placeholder="Ex: Radar Shopee Ofertas"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Chat ID ou @username
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => handleChatIdInput(e.target.value)}
                placeholder="Ex: @radarsshopee ou -1001234567890"
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none"
              >
                <option value="canal">Canal Público / Privado</option>
                <option value="grupo">Grupo / Comunidade</option>
                <option value="admin">Administrador (Alertas e Relatórios)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Adicionando...' : 'Adicionar Destino'}
            </button>
          </div>
        </form>

        {/* 3. Tabela de Canais Cadastrados */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Destinos Ativos ({channels.length})</h3>
            <p className="text-xs text-slate-400">Canais que receberão os posts programados com fotos e botão inline</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Nome</th>
                  <th className="py-3 px-4">Chat ID</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Total Enviados</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {channels.map((chan) => (
                  <tr key={chan.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-6 font-semibold text-slate-900">{chan.nome}</td>
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{chan.chat_id}</td>
                    <td className="py-3 px-4 capitalize text-slate-500">{chan.tipo}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{chan.total_enviados}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Ativo
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleTestChannel(chan.chat_id)}
                        disabled={testingChannelId === chan.chat_id}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Send className={`w-3 h-3 ${testingChannelId === chan.chat_id ? 'animate-pulse' : ''}`} />
                        {testingChannelId === chan.chat_id ? 'Enviando...' : 'Testar Envio'}
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(chan.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remover destino"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

