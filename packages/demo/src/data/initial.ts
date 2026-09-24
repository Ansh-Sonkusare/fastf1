import { type RaceTable, getRaceResults, getSchedule, toPromise } from "@f1/core";
import type { Effect } from "effect";

// One narrowing point for the results shape: getRaceResults resolves an array of
// races for the round (the finishers live on Races[0].Results), but there is no
// named export for that race-with-results element type. Derive it from the
// function itself instead of hand-declaring a shape that can drift from reality.
// Open question: export this type from @f1/core and use it in useF1Results too,
// which currently types its data as readonly unknown[]. `Race` (also from
// @f1/core) is the schedule type and has no `Results` field, so it can't stand
// in for this.
export type ResultsRace = Effect.Effect.Success<ReturnType<typeof getRaceResults>>[number];

export interface DemoInitialData {
  schedule: RaceTable;
  latestRound: number;
  latestResults: readonly ResultsRace[];
}

/** The most recent round whose date has already happened (a schedule can list future races). */
export function latestRoundWithDate(schedule: RaceTable): number {
  const today = new Date();
  return schedule.Races.reduce(
    (latest, race) => {
      if (!race.date) return latest;
      const raceDate = new Date(race.date);
      if (raceDate > today) return latest;
      const roundNum = Number(race.round);
      return roundNum > latest ? roundNum : latest;
    },
    Number(schedule.Races[0]?.round ?? 1),
  );
}

export async function loadInitialData(): Promise<DemoInitialData> {
  const schedule = await toPromise(getSchedule(2025));
  const latestRound = latestRoundWithDate(schedule);
  const latestResults = await toPromise(getRaceResults(2025, latestRound));
  return { schedule, latestRound, latestResults };
}
