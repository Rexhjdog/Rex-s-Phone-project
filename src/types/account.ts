/**
 * Account and device management types.
 */

export interface Account {
  id: string;
  token: string;
  expiry: Date;
  maxDevices: number;
  status: AccountStatus;
}

export enum AccountStatus {
  Active = 'active',
  Expired = 'expired',
  New = 'new',
}

export interface Device {
  id: string;
  name: string;
  publicKey: string;
  ipv4Address: string;
  ipv6Address: string;
  created: Date;
  lastUsed: Date;
  isCurrent: boolean;
}

export interface DeviceEvent {
  type: 'added' | 'removed' | 'rotated_key' | 'updated';
  device: Device;
  timestamp: Date;
}

export interface AccountLoginRequest {
  accountNumber: string;
}

export interface AccountCreationResponse {
  accountNumber: string;
  token: string;
  expiry: Date;
}

export interface DeviceKeyRotation {
  oldPublicKey: string;
  newPublicKey: string;
  newPrivateKey: string;
  timestamp: Date;
}

export interface PaymentInfo {
  type: 'time';
  timeAdded: number; // days
  newExpiry: Date;
}

export interface VoucherRedemption {
  code: string;
  timeAdded: number; // seconds
  newExpiry: Date;
}
