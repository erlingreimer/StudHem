import type {
  Building, Contract, Facility, MaintenanceRequest, Property, User,
} from '@/types';

export const userFixtures: User[] = [
  { id: 'u-admin', name: 'Anna Admin', email: 'anna@studhem.se', username: 'admin',
    role: 'admin', password: 'admin123', status: 'active' },
  { id: 'u-staff', name: 'Sven Staff', email: 'sven@studhem.se', username: 'staff',
    role: 'staff', password: 'staff123', status: 'active' },
  { id: 'u-res1', name: 'Rasmus Resident', email: 'rasmus@student.se', username: 'resident',
    role: 'resident', password: 'resident123', status: 'active' },
  { id: 'u-res2', name: 'Rebecka Resident', email: 'rebecka@student.se', username: 'resident2',
    role: 'resident', password: 'resident123', status: 'active' },
  { id: 'u-pending', name: 'Pia Pending', email: 'pia@student.se', username: 'pending',
    role: 'resident', password: 'temp-xyz', status: 'pending' },
];

export const buildingFixtures: Building[] = [
  { id: 'b-norra', name: 'Norra Huset', address: 'Studentvägen 1' },
  { id: 'b-sodra', name: 'Södra Huset', address: 'Studentvägen 2' },
];

export const propertyFixtures: Property[] = [
  { id: 'p-101', name: 'Rum 101', address: 'Studentvägen 1', roomType: 'corridor room',
    rent: 4200, status: 'occupied', residentId: 'u-res1', buildingId: 'b-norra' },
  { id: 'p-102', name: 'Rum 102', address: 'Studentvägen 1', roomType: 'corridor room',
    rent: 4200, status: 'occupied', residentId: 'u-res2', buildingId: 'b-norra' },
  { id: 'p-103', name: 'Rum 103', address: 'Studentvägen 1', roomType: 'corridor room',
    rent: 4200, status: 'vacant', buildingId: 'b-norra' },
  { id: 'p-104', name: 'Studio 104', address: 'Studentvägen 1', roomType: 'studio',
    rent: 6500, status: 'vacant', buildingId: 'b-norra' },
  { id: 'p-201', name: 'Rum 201', address: 'Studentvägen 2', roomType: 'corridor room',
    rent: 4300, status: 'vacant', buildingId: 'b-sodra' },
  { id: 'p-202', name: 'Rum 202', address: 'Studentvägen 2', roomType: 'corridor room',
    rent: 4300, status: 'vacant', buildingId: 'b-sodra' },
  { id: 'p-203', name: 'Studio 203', address: 'Studentvägen 2', roomType: 'studio',
    rent: 6700, status: 'vacant', buildingId: 'b-sodra' },
  { id: 'p-204', name: 'Studio 204', address: 'Studentvägen 2', roomType: 'studio',
    rent: 6700, status: 'vacant', buildingId: 'b-sodra' },
];

export const contractFixtures: Contract[] = [
  { id: 'c-1', propertyId: 'p-101', residentId: 'u-res1', startDate: '2026-01-01',
    rent: 4200, terms: 'Standardvillkor', status: 'active' },
  { id: 'c-2', propertyId: 'p-102', residentId: 'u-res2', startDate: '2026-02-01',
    rent: 4200, terms: 'Standardvillkor', status: 'active' },
];

export const facilityFixtures: Facility[] = [
  { id: 'f-n-laundry', type: 'laundry',     buildingId: 'b-norra', label: 'Tvättstuga Norra' },
  { id: 'f-n-sauna',   type: 'sauna',       buildingId: 'b-norra', label: 'Bastu Norra' },
  { id: 'f-n-common',  type: 'common_room', buildingId: 'b-norra', label: 'Gemensamhetsrum Norra' },
  { id: 'f-n-guest',   type: 'guest_room',  buildingId: 'b-norra', label: 'Gästrum Norra' },
  { id: 'f-s-laundry', type: 'laundry',     buildingId: 'b-sodra', label: 'Tvättstuga Södra' },
  { id: 'f-s-sauna',   type: 'sauna',       buildingId: 'b-sodra', label: 'Bastu Södra' },
  { id: 'f-s-common',  type: 'common_room', buildingId: 'b-sodra', label: 'Gemensamhetsrum Södra' },
  { id: 'f-s-guest',   type: 'guest_room',  buildingId: 'b-sodra', label: 'Gästrum Södra' },
];

export const maintenanceFixtures: MaintenanceRequest[] = [
  {
    id: 'mr-1',
    propertyId: 'p-101',
    residentId: 'u-res1',
    category: 'plumbing',
    description: 'Vattenkran droppar i köket.',
    photoUrls: [],
    status: 'received',
    createdAt: '2026-05-20T08:00:00Z',
    history: [
      { status: 'received', at: '2026-05-20T08:00:00Z' },
    ],
  },
  {
    id: 'mr-2',
    propertyId: 'p-102',
    residentId: 'u-res2',
    category: 'appliance',
    description: 'Kylskåpet fryser inte ordentligt.',
    photoUrls: [],
    status: 'in_progress',
    assignedTo: 'u-staff',
    createdAt: '2026-05-18T11:30:00Z',
    history: [
      { status: 'received', at: '2026-05-18T11:30:00Z' },
      { status: 'in_progress', at: '2026-05-19T09:00:00Z', note: 'Tekniker bokad' },
    ],
  },
  {
    id: 'mr-3',
    propertyId: 'p-101',
    residentId: 'u-res1',
    category: 'door_lock',
    description: 'Låset hakar upp.',
    photoUrls: [],
    status: 'resolved',
    assignedTo: 'u-staff',
    createdAt: '2026-05-10T14:00:00Z',
    history: [
      { status: 'received', at: '2026-05-10T14:00:00Z' },
      { status: 'in_progress', at: '2026-05-11T10:00:00Z' },
      { status: 'resolved', at: '2026-05-12T15:30:00Z', note: 'Bytt cylinder' },
    ],
  },
];
