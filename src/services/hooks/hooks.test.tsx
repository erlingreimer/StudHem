import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { seedDatabase } from '@/services/mock/seed';
import {
  useProperties, useProperty, useCreateProperty, useUpdateProperty, useDeleteProperty,
} from '@/services/hooks/properties';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('property query hooks', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('useProperties returns the seeded rows', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.length ?? 0).toBeGreaterThan(0));
  });

  it('useProperty returns a single row', async () => {
    const { result } = renderHook(() => useProperty('p-101'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.id).toBe('p-101'));
  });

  it('useCreateProperty invalidates the list', async () => {
    const w = wrapper();
    const list = renderHook(() => useProperties(), { wrapper: w });
    await waitFor(() => expect(list.result.current.data?.length ?? 0).toBeGreaterThan(0));
    const before = list.result.current.data!.length;
    const mut = renderHook(() => useCreateProperty(), { wrapper: w });
    await act(async () => {
      await mut.result.current.mutateAsync({
        name: 'New', address: 'Addr', roomType: 'studio',
        rent: 5000, status: 'vacant', buildingId: 'b-norra',
      });
    });
    await waitFor(() => expect(list.result.current.data?.length).toBe(before + 1));
  });

  it('useUpdateProperty and useDeleteProperty refresh the cache', async () => {
    const w = wrapper();
    const u = renderHook(() => useUpdateProperty(), { wrapper: w });
    await act(async () => {
      await u.result.current.mutateAsync({ id: 'p-101', patch: { rent: 9999 } });
    });
    const one = renderHook(() => useProperty('p-101'), { wrapper: w });
    await waitFor(() => expect(one.result.current.data?.rent).toBe(9999));

    const d = renderHook(() => useDeleteProperty(), { wrapper: w });
    await act(async () => {
      await d.result.current.mutateAsync('p-103');
    });
    const gone = renderHook(() => useProperty('p-103'), { wrapper: w });
    await waitFor(() => expect(gone.result.current.data).toBeUndefined());
  });
});
