export type Role = 'admin' | 'staff' | 'resident';
export type UserStatus = 'pending' | 'active';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  /** mock only: plaintext compare in the mock auth service, never in production */
  password: string;
  status: UserStatus;
}

/** User shape exposed to the UI — never carries the password. */
export type SafeUser = Omit<User, 'password'>;

export type PropertyStatus = 'vacant' | 'occupied';

export interface Property {
  id: string;
  name: string;
  address: string;
  roomType: string;
  rent: number;
  status: PropertyStatus;
  description?: string;
  residentId?: string;
  buildingId: string;
}

export type ContractStatus = 'active' | 'notice_given' | 'ended';

export interface Contract {
  id: string;
  propertyId: string;
  residentId: string;
  startDate: string;
  endDate?: string;
  rent: number;
  terms: string;
  status: ContractStatus;
  noticeGivenAt?: string;
}

export type MaintenanceStatus = 'received' | 'in_progress' | 'resolved';
export type MaintenanceCategory =
  | 'appliance' | 'plumbing' | 'electrical' | 'heating'
  | 'door_lock' | 'internet' | 'other';

export interface MaintenanceHistoryEntry {
  status: MaintenanceStatus;
  at: string;
  note?: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  residentId: string;
  category: MaintenanceCategory;
  description: string;
  photoUrls: string[];
  status: MaintenanceStatus;
  assignedTo?: string;
  createdAt: string;
  history: MaintenanceHistoryEntry[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  propertyId: string;
  participantIds: string[];
}

export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue';

export interface Invoice {
  id: string;
  contractId: string;
  period: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  paidAt?: string;
}

export type FacilityType = 'laundry' | 'common_room' | 'guest_room' | 'sauna';

export interface Facility {
  id: string;
  type: FacilityType;
  buildingId: string;
  label: string;
}

export interface Booking {
  id: string;
  facilityType: FacilityType;
  facilityId: string;
  bookedById: string;
  start: string;
  end: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'house_rules' | 'guide' | 'faq';
  url: string;
  language: 'sv' | 'en';
}

export interface Building {
  id: string;
  name: string;
  address: string;
}
