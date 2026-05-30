/** Central key factory so invalidations stay in sync with reads. */
export const keys = {
  properties: () => ['properties'] as const,
  property: (id: string) => ['properties', id] as const,
  contractByProperty: (propertyId: string) => ['contracts', 'byProperty', propertyId] as const,
  users: () => ['users'] as const,
  user: (id: string) => ['users', id] as const,
};
