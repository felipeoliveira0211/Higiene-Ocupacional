import { format, differenceInSeconds, addSeconds, parseISO } from 'date-fns';

export interface Pause {
  start: string;
  end?: string;
}

export const calculateTotalPauseSeconds = (pauses: Pause[], currentNow?: string) => {
  return pauses.reduce((acc, pause) => {
    const start = parseISO(pause.start);
    const end = pause.end ? parseISO(pause.end) : (currentNow ? parseISO(currentNow) : start);
    return acc + Math.max(0, differenceInSeconds(end, start));
  }, 0);
};

export const calculateEffectiveSamplingSeconds = (startTime: string, endTime: string, pauses: Pause[]) => {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const totalSeconds = differenceInSeconds(end, start);
  const pauseSeconds = calculateTotalPauseSeconds(pauses);
  return Math.max(0, totalSeconds - pauseSeconds);
};

export const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const parseDurationToSeconds = (duration: string) => {
  if (!duration) return 0;
  const [h, m] = duration.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
};

export const calculateTimeMetrics = (
  startTime: string,
  estimatedDuration: string,
  pauses: Pause[],
  isPaused: boolean,
  status: 'open' | 'completed',
  endTime?: string
) => {
  const now = getBrasiliaNow().toISOString();
  const end = status === 'completed' ? (endTime || now) : now;
  
  // If currently paused, we need to calculate up to the start of the current pause
  // but the calculateTotalPauseSeconds already handles the "ongoing" pause if we pass currentNow.
  // However, the user wants "Elapsed Time" and "Remaining Time" to FREEZE during pause.
  
  let effectiveNow = end;
  if (isPaused && status === 'open') {
    const lastPause = pauses[pauses.length - 1];
    if (lastPause && !lastPause.end) {
      effectiveNow = lastPause.start;
    }
  }

  const effectiveSeconds = calculateEffectiveSamplingSeconds(startTime, effectiveNow, pauses);
  const estimatedSeconds = parseDurationToSeconds(estimatedDuration);
  const remainingSeconds = Math.max(0, estimatedSeconds - effectiveSeconds);

  return {
    elapsed: formatDuration(effectiveSeconds),
    remaining: formatDuration(remainingSeconds),
    effectiveSeconds,
    remainingSeconds
  };
};

export const getBrasiliaISOString = () => {
  // Returns "YYYY-MM-DDTHH:mm:ss-03:00" in Brasília time
  const dateStr = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(' ', 'T');
  return dateStr + '-03:00';
};

export const getBrasiliaNow = () => {
  // Returns a Date object representing the current time in Brasília
  return parseISO(getBrasiliaISOString());
};

export const formatForDateTimeLocal = (date: Date | string) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const parseDateTimeLocalToBrasiliaISO = (value: string) => {
  if (!value) return '';
  // value is "YYYY-MM-DDTHH:mm"
  // We want to store it as "YYYY-MM-DDTHH:mm:ss-03:00" (Brasília time)
  return value + ':00-03:00';
};
