import { addDays, differenceInCalendarDays } from "date-fns";

export interface PregnancyState {
  week: number;            // 0..42
  dayOfWeek: number;       // 0..6
  trimester: 1 | 2 | 3;
  dueDate: Date;
  lmpDate: Date;
  daysRemaining: number;
  weeksRemaining: number;
  progressPct: number;     // 0..100
}

/**
 * Either lmp or due is required. Pregnancy is counted from LMP (40 weeks).
 */
export const computePregnancy = (
  args: { lmpDate?: Date | string | null; dueDate?: Date | string | null },
  today: Date = new Date(),
): PregnancyState | null => {
  let lmp: Date | null = null;
  let due: Date | null = null;
  if (args.lmpDate) lmp = new Date(args.lmpDate);
  if (args.dueDate) due = new Date(args.dueDate);
  if (!lmp && due) lmp = addDays(due, -280);
  if (!due && lmp) due = addDays(lmp, 280);
  if (!lmp || !due) return null;

  const daysIn = Math.max(0, differenceInCalendarDays(today, lmp));
  const week = Math.floor(daysIn / 7);
  const dayOfWeek = daysIn % 7;
  const trimester: 1 | 2 | 3 = week < 13 ? 1 : week < 27 ? 2 : 3;
  const daysRemaining = Math.max(0, differenceInCalendarDays(due, today));
  const weeksRemaining = Math.max(0, 40 - week);
  const progressPct = Math.min(100, Math.round((week / 40) * 100));

  return { week, dayOfWeek, trimester, dueDate: due, lmpDate: lmp, daysRemaining, weeksRemaining, progressPct };
};

export const trimesterLabel = (t: 1 | 2 | 3) =>
  t === 1 ? "First Trimester" : t === 2 ? "Second Trimester" : "Third Trimester";
