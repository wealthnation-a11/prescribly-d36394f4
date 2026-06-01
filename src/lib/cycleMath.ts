// Pure cycle / fertility math helpers
import { addDays, differenceInCalendarDays, formatISO } from "date-fns";

export type FertilityStatus = "low" | "medium" | "high" | "ovulation" | "period";

export interface CycleState {
  cycleDay: number;            // 1..cycleLength
  cycleLength: number;
  periodLength: number;
  cycleStart: Date;            // first day of current cycle
  nextPeriod: Date;
  ovulationDate: Date;         // cycleLength - 14
  fertileStart: Date;          // ovulation - 5
  fertileEnd: Date;            // ovulation + 1
  status: FertilityStatus;
  daysUntilNextPeriod: number;
  daysUntilOvulation: number;
}

export const computeCycle = (
  lastPeriodStart: Date | string,
  cycleLength = 28,
  periodLength = 5,
  today: Date = new Date(),
): CycleState => {
  const last = typeof lastPeriodStart === "string" ? new Date(lastPeriodStart) : lastPeriodStart;
  // Roll forward to the current cycle
  let cycleStart = new Date(last);
  while (differenceInCalendarDays(today, cycleStart) >= cycleLength) {
    cycleStart = addDays(cycleStart, cycleLength);
  }
  const cycleDay = differenceInCalendarDays(today, cycleStart) + 1;
  const nextPeriod = addDays(cycleStart, cycleLength);
  const ovulationDate = addDays(cycleStart, cycleLength - 14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  let status: FertilityStatus = "low";
  if (cycleDay <= periodLength) status = "period";
  else if (formatISO(today, { representation: "date" }) === formatISO(ovulationDate, { representation: "date" })) status = "ovulation";
  else if (today >= fertileStart && today <= fertileEnd) status = "high";
  else if (Math.abs(differenceInCalendarDays(today, ovulationDate)) <= 7) status = "medium";

  return {
    cycleDay,
    cycleLength,
    periodLength,
    cycleStart,
    nextPeriod,
    ovulationDate,
    fertileStart,
    fertileEnd,
    status,
    daysUntilNextPeriod: differenceInCalendarDays(nextPeriod, today),
    daysUntilOvulation: differenceInCalendarDays(ovulationDate, today),
  };
};

export const statusLabel = (s: FertilityStatus) =>
  ({ low: "Low Fertility", medium: "Medium Fertility", high: "High Fertility", ovulation: "Ovulation Day", period: "Period" }[s]);

export const conceptionCurve = (ovulationDate: Date) => {
  // returns 9 days centred around ovulation with conception % (rough rule-of-thumb)
  const probs = [5, 10, 20, 45, 75, 90, 75, 45, 20];
  return probs.map((p, i) => ({
    date: addDays(ovulationDate, i - 4),
    probability: p,
  }));
};
