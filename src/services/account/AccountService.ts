/**
 * Account management service.
 * Handles account creation, login, expiry checking, and voucher redemption.
 */

import {
  Account,
  AccountStatus,
  AccountLoginRequest,
  AccountCreationResponse,
  VoucherRedemption,
} from '../../types/account';
import { SecureStorage } from '../storage/SecureStorage';
import { API_BASE_URL, ACCOUNT_NUMBER_LENGTH } from '../../config/constants';

const ACCOUNT_STORAGE_KEY = 'mullvad_account';

export class AccountService {
  private currentAccount: Account | null = null;
  private storage: SecureStorage;

  constructor() {
    this.storage = new SecureStorage();
  }

  /**
   * Log in with an existing account number.
   */
  async login(request: AccountLoginRequest): Promise<Account> {
    const accountNumber = this.sanitizeAccountNumber(request.accountNumber);

    if (!this.validateAccountNumber(accountNumber)) {
      throw new Error('Invalid account number format. Must be 16 digits.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accountNumber}`,
        },
        body: JSON.stringify({ account_number: accountNumber }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid account number');
        }
        throw new Error(`Account lookup failed: ${response.status}`);
      }

      const data = await response.json();

      this.currentAccount = {
        id: accountNumber,
        token: data.token || accountNumber,
        expiry: new Date(data.expiry),
        maxDevices: data.max_devices || 5,
        status: this.determineAccountStatus(new Date(data.expiry)),
      };

      await this.persistAccount();
      return this.currentAccount;
    } catch (error) {
      // If network fails, attempt offline login with stored data
      const stored = await this.loadStoredAccount();
      if (stored && stored.id === accountNumber) {
        this.currentAccount = stored;
        return stored;
      }
      throw error;
    }
  }

  /**
   * Create a new account.
   */
  async createAccount(): Promise<AccountCreationResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/accounts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Account creation failed: ${response.status}`);
    }

    const data = await response.json();

    const account: Account = {
      id: data.account_number,
      token: data.token,
      expiry: new Date(data.expiry),
      maxDevices: 5,
      status: AccountStatus.New,
    };

    this.currentAccount = account;
    await this.persistAccount();

    return {
      accountNumber: data.account_number,
      token: data.token,
      expiry: account.expiry,
    };
  }

  /**
   * Log out and clear stored account data.
   */
  async logout(): Promise<void> {
    this.currentAccount = null;
    await this.storage.remove(ACCOUNT_STORAGE_KEY);
  }

  /**
   * Get the currently logged-in account.
   */
  getAccount(): Account | null {
    return this.currentAccount ? { ...this.currentAccount } : null;
  }

  /**
   * Check if user is logged in.
   */
  isLoggedIn(): boolean {
    return this.currentAccount !== null;
  }

  /**
   * Check if the account has expired.
   */
  isExpired(): boolean {
    if (!this.currentAccount) return true;
    return new Date() > this.currentAccount.expiry;
  }

  /**
   * Get remaining time on the account.
   */
  getRemainingTime(): { days: number; hours: number } | null {
    if (!this.currentAccount) return null;

    const now = new Date();
    const expiry = this.currentAccount.expiry;
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0 };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    };
  }

  /**
   * Redeem a voucher code to add time.
   */
  async redeemVoucher(code: string): Promise<VoucherRedemption> {
    if (!this.currentAccount) {
      throw new Error('Not logged in');
    }

    const response = await fetch(`${API_BASE_URL}/v1/vouchers/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.currentAccount.token}`,
      },
      body: JSON.stringify({ voucher_code: code.trim().toUpperCase() }),
    });

    if (!response.ok) {
      if (response.status === 400) throw new Error('Invalid voucher code');
      if (response.status === 410) throw new Error('Voucher already used');
      throw new Error(`Voucher redemption failed: ${response.status}`);
    }

    const data = await response.json();

    const result: VoucherRedemption = {
      code: code.trim().toUpperCase(),
      timeAdded: data.time_added,
      newExpiry: new Date(data.new_expiry),
    };

    // Update local account
    this.currentAccount.expiry = result.newExpiry;
    this.currentAccount.status = AccountStatus.Active;
    await this.persistAccount();

    return result;
  }

  /**
   * Refresh account data from server.
   */
  async refreshAccount(): Promise<Account | null> {
    if (!this.currentAccount) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/v1/accounts/me`, {
        headers: {
          'Authorization': `Bearer ${this.currentAccount.token}`,
        },
      });

      if (!response.ok) return this.currentAccount;

      const data = await response.json();
      this.currentAccount.expiry = new Date(data.expiry);
      this.currentAccount.status = this.determineAccountStatus(
        this.currentAccount.expiry
      );

      await this.persistAccount();
      return this.currentAccount;
    } catch {
      return this.currentAccount;
    }
  }

  /**
   * Restore session from stored data.
   */
  async restoreSession(): Promise<Account | null> {
    const stored = await this.loadStoredAccount();
    if (stored) {
      stored.status = this.determineAccountStatus(stored.expiry);
      this.currentAccount = stored;
      return stored;
    }
    return null;
  }

  /**
   * Format account number for display (groups of 4).
   */
  static formatAccountNumber(accountNumber: string): string {
    const clean = accountNumber.replace(/\s/g, '');
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }

  private validateAccountNumber(accountNumber: string): boolean {
    const clean = accountNumber.replace(/\s/g, '');
    return /^\d{16}$/.test(clean);
  }

  private sanitizeAccountNumber(input: string): string {
    return input.replace(/[^0-9]/g, '');
  }

  private determineAccountStatus(expiry: Date): AccountStatus {
    const now = new Date();
    if (now > expiry) return AccountStatus.Expired;
    return AccountStatus.Active;
  }

  private async persistAccount(): Promise<void> {
    if (this.currentAccount) {
      await this.storage.set(
        ACCOUNT_STORAGE_KEY,
        JSON.stringify(this.currentAccount)
      );
    }
  }

  private async loadStoredAccount(): Promise<Account | null> {
    try {
      const data = await this.storage.get(ACCOUNT_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.expiry = new Date(parsed.expiry);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}
