'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Radar,
  Kanban,
  ShoppingBag,
  Send,
  Zap,
  History,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Radar de Ofertas', href: '/radar', icon: Radar },
  { name: 'Esteira Kanban', href: '/esteira', icon: Kanban },
  { name: 'Configuração Shopee', href: '/shopee', icon: ShoppingBag },
  { name: 'Telegram', href: '/telegram', icon: Send },
  { name: 'Automação & Jobs', href: '/automacao', icon: Zap },
  { name: 'Histórico', href: '/historico', icon: History },
  { name: 'Logs do Sistema', href: '/logs', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col flex-shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-shopee flex items-center justify-center text-white shadow-lg shadow-shopee/30">
          <Radar className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight tracking-tight">
            Radar Shopee
          </h1>
          <span className="text-[11px] text-slate-400 font-medium">Automação de Afiliados</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-shopee text-white shadow-md shadow-shopee/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Status Bar dos Serviços */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 m-3 rounded-xl space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Status dos Conectores
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Shopee API
          </span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Oficial
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Telegram Bot
          </span>
          <span className="text-blue-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Online
          </span>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
            CH
          </div>
          <div className="text-xs min-w-0">
            <p className="font-medium text-white leading-tight truncate">Carlos Henrique</p>
            <p className="text-slate-400 text-[10px] truncate">carloshenrq1245@gmail.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Encerrar sessão"
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

