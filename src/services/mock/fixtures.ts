import type { User } from '@/types';

export const userFixtures: User[] = [
  { id: 'u-admin', name: 'Anna Admin', email: 'anna@studhem.se', username: 'admin',
    role: 'admin', password: 'admin123', status: 'active' },
  { id: 'u-staff', name: 'Sven Staff', email: 'sven@studhem.se', username: 'staff',
    role: 'staff', password: 'staff123', status: 'active' },
  { id: 'u-res1', name: 'Rasmus Resident', email: 'rasmus@student.se', username: 'resident',
    role: 'resident', password: 'resident123', status: 'active' },
];
