import {
  type Race,
  type RaceTable,
  getRaceResults,
  getSchedule,
  toPromise,
} from "@f1/core";

export interface DemoInitialData {
  schedule: RaceTable;
  latestRound: number;
  latestResults: Race[];
}

export async function loadInitialData(): Promise<DemoInitialData> {
  const schedule = await toPromise(getSchedule(2025));
  const latestRound = schedule.Races.reduce(
    (max, race) => Math.max(max, Number(race.round)),
    Number(schedule.Races[0]?.round ?? 1),
  );
  const latestResults = await toPromise(getRaceResults(2025, latestRound));
  return { schedule, latestRound, latestResults };
}
