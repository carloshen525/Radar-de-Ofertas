// Robô de Automação em Background (Execução Contínua e Automática 24/7)
// Regra: Nunca desliga. Opera o dia todo, pausando apenas entre as 00:30 e as 06:00 da manhã.

import { db } from '@/lib/db';
import { automationEngine } from './AutomationEngine';
import { verificarPausaNoturna, QuietHoursStatus } from '@/lib/schedule';

export interface WorkerStatus {
  ativo: boolean;
  emPausaNoturna: boolean;
  horaBrasilia: string;
  mensagemPausa: string;
  proximaRetomada: string;
  rodandoAgora: boolean;
  ultimoCicloEm: string | null;
  proximoCicloEm: string | null;
  totalCiclosExecutados: number;
  ultimoResultado: string | null;
  intervaloMinutos: number;
}

class BackgroundWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private lastRun: Date | null = null;
  private nextRun: Date | null = null;
  private cycleCount = 0;
  private lastResultText: string | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const settings = await db.getAutomationSettings();
      // Piloto automático fica sempre ativo por padrão
      this.start(settings.intervalo_minutos || 15);
    } catch {
      this.start(15);
    }
  }

  /**
   * Inicia ou reinicia o temporizador contínuo
   */
  start(intervalMinutes: number = 15) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const intervalMs = Math.max(intervalMinutes, 2) * 60 * 1000;
    this.nextRun = new Date(Date.now() + intervalMs);

    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);

    console.log(`[Radar Shopee Worker] Piloto automático ativo. Ciclos contínuos a cada ${intervalMinutes} minutos.`);
  }

  /**
   * Para o temporizador temporariamente
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.nextRun = null;
  }

  /**
   * Ciclo de execução periódico programado
   */
  private async tick() {
    // Checa se está no intervalo de pausa noturna (00:30 às 06:00 - Horário de Brasília)
    const statusPausa = verificarPausaNoturna();
    if (statusPausa.emPausa) {
      this.lastResultText = statusPausa.mensagem;
      console.log(`[Radar Shopee Worker] ${statusPausa.mensagem}`);
      return;
    }

    await this.triggerNow('Ciclo Automático Programado');
  }

  /**
   * Dispara o ciclo de automação
   */
  async triggerNow(origem: string = 'Disparo Manual', forcar: boolean = false): Promise<any> {
    if (this.isProcessing) {
      return { status: 'alerta', message: 'Um ciclo de automação já está em andamento.' };
    }

    // Se for ciclo automático (não manual) e estiver na pausa noturna, não executa
    const statusPausa = verificarPausaNoturna();
    if (statusPausa.emPausa && !forcar && origem.includes('Automático')) {
      this.lastResultText = statusPausa.mensagem;
      return {
        success: true,
        em_pausa_noturna: true,
        message: statusPausa.mensagem,
        resumo: statusPausa.mensagem,
      };
    }

    this.isProcessing = true;
    this.lastRun = new Date();

    const settings = await db.getAutomationSettings();
    const intervalMs = Math.max(settings.intervalo_minutos || 15, 2) * 60 * 1000;
    this.nextRun = new Date(Date.now() + intervalMs);

    try {
      console.log(`[Radar Shopee Worker] Executando ciclo: ${origem}`);

      // Executa os jobs da esteira
      const resultado = await automationEngine.runFullPipeline();

      this.cycleCount++;
      const achados = resultado?.summary?.busca?.saved || 0;
      const aprovados = resultado?.summary?.analise?.approved || 0;
      const copys = resultado?.summary?.ia?.generated || 0;
      const publicados = resultado?.summary?.publicacao?.published || 0;

      this.lastResultText = `${achados} novos produtos minerados, ${aprovados} aprovados, ${copys} copys geradas, ${publicados} publicados.`;

      await db.addLog({
        modulo: 'automacao',
        evento: 'Ciclo do Robô Automático',
        status: 'sucesso',
        mensagem: `[${origem}] ${this.lastResultText}`,
        detalhes: resultado,
      });

      return { success: true, resultado, resumo: this.lastResultText };
    } catch (err: any) {
      this.lastResultText = `Erro: ${err.message}`;
      await db.addLog({
        modulo: 'automacao',
        evento: 'Falha no Ciclo Automático',
        status: 'erro',
        mensagem: `Erro na execução automática: ${err.message}`,
      });
      return { success: false, error: err.message };
    } finally {
      this.isProcessing = false;
    }
  }

  getStatus(): WorkerStatus {
    const statusPausa = verificarPausaNoturna();

    // Garante que o timer esteja rodando caso tenha subido uma nova instância serverless
    if (!this.timer) {
      this.start(15);
    }

    let resultadoFinal = this.lastResultText;
    if (statusPausa.emPausa) {
      resultadoFinal = statusPausa.mensagem;
    } else if (!resultadoFinal) {
      resultadoFinal = `Piloto automático ativo (Horário atual: ${statusPausa.horaAtualFormatada}). Operando o dia todo até 00:30.`;
    }

    return {
      ativo: true, // Sempre ativo (o piloto automático nunca desliga)
      emPausaNoturna: statusPausa.emPausa,
      horaBrasilia: statusPausa.horaAtualFormatada,
      mensagemPausa: statusPausa.mensagem,
      proximaRetomada: statusPausa.proximaRetomada,
      rodandoAgora: this.isProcessing,
      ultimoCicloEm: this.lastRun ? this.lastRun.toISOString() : null,
      proximoCicloEm: this.nextRun ? this.nextRun.toISOString() : null,
      totalCiclosExecutados: this.cycleCount,
      ultimoResultado: resultadoFinal,
      intervaloMinutos: 15,
    };
  }
}

// Singleton no processo global do Node.js
const globalForWorker = global as unknown as { backgroundWorker?: BackgroundWorker };
export const backgroundWorker = globalForWorker.backgroundWorker || new BackgroundWorker();
if (process.env.NODE_ENV !== 'production') globalForWorker.backgroundWorker = backgroundWorker;
