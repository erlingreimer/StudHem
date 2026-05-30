/** Central key factory so invalidations stay in sync with reads. */
export const keys = {
  properties: () => ['properties'] as const,
  property: (id: string) => ['properties', id] as const,
  contractByProperty: (propertyId: string) => ['contracts', 'byProperty', propertyId] as const,
  users: () => ['users'] as const,
  user: (id: string) => ['users', id] as const,
  maintenance: () => ['maintenance'] as const,
  maintenanceByResident: (residentId: string) =>
    ['maintenance', 'byResident', residentId] as const,
  maintenanceByProperty: (propertyId: string) =>
    ['maintenance', 'byProperty', propertyId] as const,
  maintenanceRequest: (id: string) => ['maintenance', id] as const,
  conversations: (userId: string) => ['conversations', userId] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  invoices: () => ['invoices'] as const,
  invoicesByResident: (residentId: string) =>
    ['invoices', 'byResident', residentId] as const,
};
