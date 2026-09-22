import { Effect } from "effect";
import { type F1ClientService, F1ClientServiceLive } from "../http/service";

export function toPromise<A, E>(effect: Effect.Effect<A, E, F1ClientService>): Promise<A> {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}
