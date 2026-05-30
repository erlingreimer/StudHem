import type { Contract, Property, SafeUser } from '@/types';

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

/** The backend contract. Mock impl today; a REST impl can replace it later. */
export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
}
