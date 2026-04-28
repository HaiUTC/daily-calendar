import { InlineKeyboard } from 'grammy';
import { ACTIVITIES, ACTIVITY_LABELS } from '../types';
import type { ActivityType } from '../types';

export function buildMorningMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(ACTIVITY_LABELS['work'], 'start:work')
    .text(ACTIVITY_LABELS['study'], 'start:study')
    .row()
    .text(ACTIVITY_LABELS['exercise'], 'start:exercise')
    .text(ACTIVITY_LABELS['reading'], 'start:reading');
}

export function buildActiveKeyboard(currentActivity: ActivityType): InlineKeyboard {
  const kb = new InlineKeyboard().text('⏹ Stop', 'stop').row();

  const others = ACTIVITIES.filter((a) => a !== currentActivity);
  others.forEach((a) => kb.text(ACTIVITY_LABELS[a], `switch:${a}`));

  return kb;
}

export function buildOvertimeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('▶️ Tiếp tục', 'ot_continue')
    .text('⏹ Dừng lại', 'ot_stop');
}
