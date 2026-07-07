import { cbrProvider } from "./cbr";
import { marketProvider } from "./market";
import { moexProvider } from "./moex";
import type { RateProvider } from "./provider";
import type { RateSource } from "../types";

const providers: Record<RateSource, RateProvider> = {
  cbr: cbrProvider,
  market: marketProvider,
  moex: moexProvider,
};

export function getRateProvider(source: RateSource): RateProvider {
  return providers[source];
}

export { cbrProvider, marketProvider, moexProvider };
