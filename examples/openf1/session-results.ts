import {
  getDrivers,
  getMeetings,
  getSessionResult,
  getSessions,
  getStartingGrid,
  toPromise,
} from "@f1/core";

async function main() {
  const meetings = await toPromise(getMeetings(2024));
  const china = meetings.find((m) => m.meeting_name === "Chinese Grand Prix");
  if (!china) throw new Error("Chinese Grand Prix 2024 not found");

  const sessions = await toPromise(getSessions(china.meeting_key));
  const sprint = sessions.find((s) => s.session_name === "Sprint");
  // OpenF1 files the starting grid under the qualifying session that set it.
  const shootout = sessions.find((s) => s.session_name === "Sprint Qualifying");
  if (!sprint || !shootout) throw new Error("Sprint weekend sessions not found");
  console.log(`${china.meeting_name} ${sprint.session_name}: session_key=${sprint.session_key}`);

  const [results, grid, drivers] = await Promise.all([
    toPromise(getSessionResult(sprint.session_key)),
    toPromise(getStartingGrid(shootout.session_key)),
    toPromise(getDrivers(sprint.session_key)),
  ]);

  const acronym = new Map(drivers.map((d) => [d.driver_number, d.name_acronym]));
  const gridSlot = new Map(grid.map((g) => [g.driver_number, g.position]));

  for (const r of results.slice(0, 10)) {
    const gap = r.gap_to_leader ? `+${r.gap_to_leader.toFixed(3)}s` : "";
    console.log(
      `P${String(r.position).padEnd(3)} ${acronym.get(r.driver_number) ?? r.driver_number}  grid P${gridSlot.get(r.driver_number) ?? "?"}  laps ${r.number_of_laps}  ${gap}`,
    );
  }
}

main();
