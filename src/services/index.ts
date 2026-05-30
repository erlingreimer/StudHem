import type { Api } from './api';
import { createMockApi } from './mock';

/** Single app-wide service handle. Swap `createMockApi()` for a REST impl later. */
export const api: Api = createMockApi();
export type { Api } from './api';
