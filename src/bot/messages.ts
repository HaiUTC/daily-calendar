import { ACTIVITY_LABELS, ACTIVITY_GOALS_SECS } from '../types';
import type { ActiveSession, DailyProgress, ActivityType } from '../types';

export type TimePeriod = 'd' | 'w' | 'm';

export function formatHM(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

export function progressEmoji(pct: number, overtime = 0): string {
  if (overtime > 0) return '🏆';
  if (pct >= 100) return '✅';
  if (pct >= 50) return '🟡';
  return '🔴';
}

export function morningMenuText(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const dayName = d.toLocaleDateString('vi-VN', { weekday: 'long' });
  const dateStr = d.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Chào buổi sáng! 🌅\nHôm nay là ${dayName}, ${dateStr}.\n\nChọn hoạt động để bắt đầu theo dõi:`;
}

export function activeStateText(session: ActiveSession, totalTodaySecs: number): string {
  const label = ACTIVITY_LABELS[session.activity];
  const goalSecs = ACTIVITY_GOALS_SECS[session.activity];
  const sessionTime = formatHM(session.elapsedSecs);
  const totalTime = formatHM(totalTodaySecs);
  const goalTime = formatHM(goalSecs);
  const overtime = Math.max(0, totalTodaySecs - goalSecs);
  const pct = Math.min(100, Math.round((totalTodaySecs / goalSecs) * 100));
  const emoji = progressEmoji(pct, overtime);

  const progressLine =
    overtime > 0
      ? `${emoji} Hôm nay: ${totalTime} / ${goalTime}  (+${formatHM(overtime)} vượt mức)`
      : `${emoji} Hôm nay: ${totalTime} / ${goalTime}  (${pct}%)`;

  return (
    `▶️ Đang theo dõi: ${label}\n` +
    `⏱ Phiên này: ${sessionTime}\n` +
    `${progressLine}\n\n` +
    `Nhấn ⏹ để dừng hoặc chuyển sang hoạt động khác.`
  );
}

export function overtimeNotificationText(activity: ActivityType, overtimeSecs: number): string {
  const label = ACTIVITY_LABELS[activity];
  const goalTime = formatHM(ACTIVITY_GOALS_SECS[activity]);
  const over = formatHM(overtimeSecs);
  return (
    `⚠️ Vượt mục tiêu! ${label}\n\n` +
    `Bạn đã ${over} vượt quá mục tiêu ${goalTime} hôm nay.\n` +
    `Bạn muốn tiếp tục hay dừng lại?`
  );
}

export function switchFooterText(
  stopped: { activity: ActivityType; durationSecs: number } | null
): string {
  if (!stopped) return '';
  return `\n↩ Vừa kết thúc ${ACTIVITY_LABELS[stopped.activity]} — ${formatHM(stopped.durationSecs)}`;
}

export function eveningReminderText(progress: DailyProgress[]): string {
  const separator = '─'.repeat(25);
  const lines = progress.map((p) => {
    const label = ACTIVITY_LABELS[p.activity].padEnd(14);
    const done = formatHM(p.totalSecs).padStart(7);
    const goal = formatHM(p.goalSecs);
    const emoji = progressEmoji(p.pct, p.overtime);
    const tail =
      p.overtime > 0
        ? ` (+${formatHM(p.overtime)} vượt)`
        : p.remaining > 0
          ? ` — còn ${formatHM(p.remaining)}`
          : '';
    const pctStr = p.overtime > 0 ? '100%' : `${p.pct}%`;
    return `${emoji} ${label} ${done} / ${goal} (${pctStr})${tail}`;
  });

  const incomplete = progress.filter((p) => p.pct < 100).length;
  const footer =
    incomplete === 0
      ? '🎉 Hoàn thành tất cả! Tuyệt vời!'
      : `Còn ${incomplete} hoạt động chưa hoàn thành. Cố lên! 💪`;

  return (
    `🌆 Tổng kết buổi tối (20:00)\n${separator}\n` +
    lines.join('\n') +
    `\n${separator}\n${footer}`
  );
}

export function nightSummaryText(
  daily: DailyProgress[],
  monthly: DailyProgress[]
): string {
  const today = new Date().toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const separator = '─'.repeat(25);

  const row = (p: DailyProgress) => {
    const label = ACTIVITY_LABELS[p.activity].padEnd(14);
    const done = formatHM(p.totalSecs).padStart(7);
    const goal = formatHM(p.goalSecs);
    const suffix =
      p.overtime > 0 ? `+${formatHM(p.overtime)}` : `${String(p.pct).padStart(3)}%`;
    return `${progressEmoji(p.pct, p.overtime)} ${label} ${done} / ${goal}  ${suffix}`;
  };

  const now = new Date();
  const monthName = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const daysElapsed = now.getDate();

  return (
    `🌙 Tổng kết ngày — ${today}\n${separator}\n` +
    daily.map(row).join('\n') +
    `\n${separator}\n📅 Lũy kế ${monthName} (${daysElapsed} ngày)\n` +
    monthly.map(row).join('\n')
  );
}

function progressRow(p: DailyProgress): string {
  const label = ACTIVITY_LABELS[p.activity].padEnd(14);
  const done = formatHM(p.totalSecs).padStart(7);
  const goal = formatHM(p.goalSecs);
  const suffix =
    p.overtime > 0 ? `+${formatHM(p.overtime)}` : `${String(p.pct).padStart(3)}%`;
  return `${progressEmoji(p.pct, p.overtime)} ${label} ${done} / ${goal}  ${suffix}`;
}

export function timeReportText(
  period: TimePeriod,
  progress: DailyProgress[],
  meta: { date?: string; weekStart?: string; weekEnd?: string; month?: string }
): string {
  const separator = '─'.repeat(25);

  let header: string;
  if (period === 'd') {
    const d = new Date(`${meta.date}T00:00:00`);
    const label = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
    header = `📊 Hôm nay — ${label}`;
  } else if (period === 'w') {
    const fmt = (s: string) => {
      const d = new Date(`${s}T00:00:00`);
      return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    };
    header = `📊 Tuần này (${fmt(meta.weekStart!)} – ${fmt(meta.weekEnd!)})`;
  } else {
    const d = new Date(`${meta.month}T00:00:00`);
    const label = d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    header = `📊 Tháng ${label} (${new Date().getDate()} ngày)`;
  }

  const total = progress.reduce((sum, p) => sum + p.totalSecs, 0);
  return `${header}\n${separator}\n${progress.map(progressRow).join('\n')}\nTổng: ${formatHM(total)}`;
}
