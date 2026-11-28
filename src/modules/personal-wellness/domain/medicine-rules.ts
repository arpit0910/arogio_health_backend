import { daysBetween, validDay } from './personal-wellness.domain';
type Medicine = { recurrence?: 'daily' | 'weekly' | 'cycle' | 'sos'; weekdays?: number[]; startDate?: string; endDate?: string | null; cycleOnDays?: number; cycleOffDays?: number };

/** The same calendar rule is applied by the API and native reminder planner. */
export function medicineDueOn(m: Pick<Medicine, 'recurrence' | 'weekdays' | 'startDate' | 'endDate' | 'cycleOnDays' | 'cycleOffDays'>, day: string) {
  if (!validDay(day) || (m.startDate && day < m.startDate) || (m.endDate && day > m.endDate)) return false;
  if (m.recurrence === 'sos') return false;
  if (m.recurrence === 'weekly') return (m.weekdays ?? []).includes(new Date(day + 'T12:00:00Z').getUTCDay());
  if (m.recurrence === 'cycle') {
    if (!m.startDate) return false;
    const on = m.cycleOnDays ?? 1, off = m.cycleOffDays ?? 1;
    return daysBetween(m.startDate, day) % (on + off) < on;
  }
  return true;
}

export function doseQuantity(amount: string) {
  if (!/^\d+(?:\.\d+)?(?:\s+[^\d].*)?$/.test(amount.trim())) return null;
  const value = Number.parseFloat(amount);
  return Number.isFinite(value) && value > 0 ? value : null;
}
