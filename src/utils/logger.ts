// Logger estruturado para rastreamento da automação serverless (Vercel + N8N)

export class AutomationLogger {
  private logs: string[] = [];

  info(message: string): void {
    this.logs.push(message);
    console.log(`[Automação N8N] ${message}`);
  }

  error(message: string, error?: any): void {
    const errorDetails = error ? ` (${error?.message || String(error)})` : '';
    const fullMsg = `[ERRO] ${message}${errorDetails}`;
    this.logs.push(fullMsg);
    console.error(`[Automação N8N] ${fullMsg}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getText(): string {
    return this.logs.join('\n');
  }
}

