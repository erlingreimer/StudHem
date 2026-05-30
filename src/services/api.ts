import type {
  Contract, MaintenanceCategory, MaintenanceRequest, MaintenanceStatus,
  Property, SafeUser,
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

export interface ContractsApi {
  byPropertyId(propertyId: string): Promise<Contract | undefined>;
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

/** The backend contract. Mock impl today; a REST impl can replace it later. */
export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
  maintenance: MaintenanceApi;
}
