import {
  type RaceTable,
  getRaceResults,
  getSchedule,
  toPromise,
} from "@f1/core";

export interface RaceResultRow {
  readonly season: string;
  readonly round: string;
  readonly raceName: string;
  readonly date?: string;
  readonly Results?: readonly unknown[];
  readonly QualifyingResults?: readonly unknown[];
  readonly SprintResults?: readonly unknown[];
}

export interface DemoInitialData {
  schedule: RaceTable;
  latestRound: number;
  latestResults: readonly RaceResultRow[];
}

export async function loadInitialData(): Promise<DemoInitialData> {
  const schedule = await toPromise(getSchedule(2025));

  const today = new Date();
  const latestRound = schedule.Races.reduce(
    (latest, race) => {
      if (!race.date) return latest;
      const raceDate = new Date(race.date);
      if (raceDate > today) return latest;
      const roundNum = Number(race.round);
      return roundNum > latest ? roundNum : latest;
    },
    Number(schedule.Races[0]?.round ?? 1),
  );

  const latestResults = await toPromise(getRaceResults(2025, latestRound));
  return { schedule, latestRound, latestResults };
}
