import { F1Client } from "../http/client";
import { type RaceTable, ScheduleResponseSchema } from "../schemas/race";

const client = new F1Client();

export async function getSchedule(year: number): Promise<RaceTable> {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    throw new Error(
      `Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`,
    );
  }

  const response = await client.fetch<ScheduleResponseSchema>(
    `/${year}.json`,
    {},
    { method: "GET" },
  );

  const parsed = ScheduleResponseSchema.parse(response);
  return parsed.MRData.RaceTable;
}
