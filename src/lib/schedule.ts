// Gerenciador de Agendamento e Intervalo de Pausa Noturna (Horário de Brasília)
// Regra do Usuário: O piloto automático nunca desliga.
// Funciona o dia todo, pausando apenas entre as 00:30 e as 06:00 da manhã.

export interface QuietHoursStatus {
  emPausa: boolean;
  horaAtualFormatada: string;
  minutoAtual: number;
  mensagem: string;
  proximaRetomada: string;
}

/**
 * Retorna o horário atual no fuso horário oficial do Brasil (America/Sao_Paulo, UTC-3)
 */
export function getBrasiliaTime(date: Date = new Date()): {
  hour: number;
  minute: number;
  formattedTime: string;
} {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { hour, minute, formattedTime };
}

/**
 * Verifica se o momento atual está dentro da janela de pausa noturna:
 * Pausa: das 00:30 até as 06:00 da manhã.
 * Ativo o dia todo: das 06:00 até as 00:30 da madrugada seguinte.
 */
export function verificarPausaNoturna(date: Date = new Date()): QuietHoursStatus {
  const { hour, minute, formattedTime } = getBrasiliaTime(date);

  const currentMinutes = hour * 60 + minute;
  const startQuiet = 0 * 60 + 30; // 00:30 (30 minutos do dia)
  const endQuiet = 6 * 60 + 0; // 06:00 (360 minutos do dia)

  const emPausa = currentMinutes >= startQuiet && currentMinutes < endQuiet;

  if (emPausa) {
    return {
      emPausa: true,
      horaAtualFormatada: formattedTime,
      minutoAtual: currentMinutes,
      mensagem: `Robô em pausa noturna programada (${formattedTime} - horário de Brasília). O envio de ofertas está pausado para não incomodar os membros do canal durante a madrugada.`,
      proximaRetomada: '06:00 (horário de Brasília)',
    };
  }

  return {
    emPausa: false,
    horaAtualFormatada: formattedTime,
    minutoAtual: currentMinutes,
    mensagem: `Piloto automático rodando normalmente (${formattedTime} - horário de Brasília). Operando o dia todo até 00:30.`,
    proximaRetomada: '00:30 (pausa noturna)',
  };
}

