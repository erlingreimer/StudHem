import type {
  Booking, Contract, Conversation, FacilityType, Invoice, MaintenanceCategory,
  MaintenanceRequest, MaintenanceStatus, Message, Property, SafeUser,
} from '@/types';

export interface AuthApi {
  login(username: string, password: string): Promise<SafeUser>;
}

export interface PropertiesApi {
  list(): Promise<Property[]>;
  get(id: string): Promise<Property | undefined>;
  create(input: Omit<Property, 'id'>): Promise<Property>;
  update(id: string, patch: Partial<Omit<Property, 'id'>>): Promise<Property>;
  remove(id: string): Promise<void>;
}

export interface MarkMovedOutResult {
  contract: Contract;
  property: Property;
}

export interface ContractsApi {
  byPropertyId(propertyId: string): Promise<Contract | undefined>;
  byResidentId(residentId: string): Promise<Contract | undefined>;
  giveNotice(contractId: string, moveOutDate: string): Promise<Contract>;
  markMovedOut(contractId: string): Promise<MarkMovedOutResult>;
}

export interface InviteInput {
  name: string;
  email: string;
  propertyId: string;
}

export interface InviteResult {
  user: SafeUser;
  tempPassword: string;
}

export interface UsersApi {
  list(): Promise<SafeUser[]>;
  get(id: string): Promise<SafeUser | undefined>;
  invite(input: InviteInput): Promise<InviteResult>;
  setPassword(userId: string, password: string): Promise<SafeUser>;
}

export interface MaintenanceCreateInput {
  propertyId: string;
  residentId: string;
  category: MaintenanceCategory;
  description: string;
  photoUrls: string[];
}

export interface MaintenanceApi {
  list(): Promise<MaintenanceRequest[]>;
  byResident(residentId: string): Promise<MaintenanceRequest[]>;
  byProperty(propertyId: string): Promise<MaintenanceRequest[]>;
  get(id: string): Promise<MaintenanceRequest | undefined>;
  create(input: MaintenanceCreateInput): Promise<MaintenanceRequest>;
  updateStatus(id: string, status: MaintenanceStatus, note?: string): Promise<MaintenanceRequest>;
  assign(id: string, staffUserId: string | undefined): Promise<MaintenanceRequest>;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  text: string;
}

export interface ChatApi {
  listConversations(userId: string): Promise<Conversation[]>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(input: SendMessageInput): Promise<Message>;
}

export interface EconomyApi {
  list(): Promise<Invoice[]>;
  byContractId(contractId: string): Promise<Invoice[]>;
  byResident(residentId: string): Promise<Invoice[]>;
  markPaid(invoiceId: string): Promise<Invoice>;
  /** Mock no-op — resolves after latency. */
  sendReminder(invoiceId: string): Promise<void>;
}

export interface CreateBookingInput {
  facilityType: FacilityType;
  facilityId: string;
  bookedById: string;
  start: string;
  end: string;
}

export interface BookingsApi {
  list(): Promise<Booking[]>;
  byResident(residentId: string): Promise<Booking[]>;
  byFacility(facilityId: string): Promise<Booking[]>;
  create(input: CreateBookingInput): Promise<Booking>;
  cancel(bookingId: string): Promise<void>;
}

/** The backend contract. Mock impl today; a REST impl can replace it later. */
export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
  maintenance: MaintenanceApi;
  chat: ChatApi;
  economy: EconomyApi;
  bookings: BookingsApi;
}
