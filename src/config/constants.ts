/** Minimum notice period (months) a resident must give before moving out. */
export const NOTICE_PERIOD_MONTHS = 2;

/** Max concurrent future bookings a resident may hold per facility type. */
export const MAX_FUTURE_BOOKINGS_PER_FACILITY = 2;

/** Namespace for all localStorage keys written by the mock service layer. */
export const STORAGE_PREFIX = 'studhem.v1.';

/** Simulated network latency (ms) for mock service calls. Zero in tests. */
export const MOCK_LATENCY_MS = import.meta.env?.MODE === 'test' ? 0 : 300;
