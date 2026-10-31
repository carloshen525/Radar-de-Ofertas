// Robô de Automação em Background (Execução Contínua e Automática)

import { db } from '@/lib/db';
import { automationEngine } from './AutomationEngine';

export interface WorkerStatus {
  ativo: boolean;
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
    // Inicia automaticamente o ciclo de monitoramento
    this.init();
  }

  private async init() {
    const settings = await db.getAutomationSettings();
    if (settings.ativo) {
      this.start(settings.intervalo_minutos || 15);
    }
  }

  /**
   * Inicia o temporizador contínuo
   */
  start(intervalMinutes: number = 15) {
    this.stop();

    const intervalMs = Math.max(intervalMinutes, 2) * 60 * 1000;
    this.nextRun = new Date(Date.now() + intervalMs);

    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);

    console.log(`[Radar Shopee Worker] Automação em background iniciada. Ciclos a cada ${intervalMinutes} minutos.`);
  }

  /**
   * Para o temporizador
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.nextRun = null;
  }

  /**
   * Ciclo de execução periódico
   */
  private async tick() {
    const settings = await db.getAutomationSettings();
    if (!settings.ativo) {
      this.stop();
      return;
    }

    await this.triggerNow('Ciclo Automático Programado');
  }

  /**
   * Dispara o ciclo de automação agora
   */
  async triggerNow(origem: string = 'Disparo Manual'): Promise<any> {
    if (this.isProcessing) {
      return { status: 'alerta', message: 'Um ciclo de automação já está em andamento.' };
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
    if (!this.timer) {
      this.init();
    }
    return {
      ativo: this.timer !== null,
      rodandoAgora: this.isProcessing,
      ultimoCicloEm: this.lastRun ? this.lastRun.toISOString() : null,
      proximoCicloEm: this.nextRun ? this.nextRun.toISOString() : null,
      totalCiclosExecutados: this.cycleCount,
      ultimoResultado: this.lastResultText,
      intervaloMinutos: 15,
    };
  }
}

// Singleton no processo global do Node.js
const globalForWorker = global as unknown as { backgroundWorker?: BackgroundWorker };
export const backgroundWorker = globalForWorker.backgroundWorker || new BackgroundWorker();
if (process.env.NODE_ENV !== 'production') globalForWorker.backgroundWorker = backgroundWorker;
