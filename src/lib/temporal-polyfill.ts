import { Temporal } from "@js-temporal/polyfill";

const globalWithTemporal = globalThis as typeof globalThis & {
	Temporal?: typeof Temporal;
};

globalWithTemporal.Temporal ??= Temporal;
