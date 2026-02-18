/**
 * Tests for AccountService.
 */

import { AccountService } from '../../src/services/account/AccountService';
import { AccountStatus } from '../../src/types/account';

describe('AccountService', () => {
  describe('Account number validation', () => {
    it('should format account number with spaces', () => {
      const formatted = AccountService.formatAccountNumber('1234567890123456');
      expect(formatted).toBe('1234 5678 9012 3456');
    });

    it('should handle already formatted numbers', () => {
      const formatted = AccountService.formatAccountNumber('1234 5678 9012 3456');
      expect(formatted).toBe('1234 5678 9012 3456');
    });

    it('should handle partial numbers', () => {
      const formatted = AccountService.formatAccountNumber('12345678');
      expect(formatted).toBe('1234 5678');
    });
  });

  describe('Account status', () => {
    it('should have correct enum values', () => {
      expect(AccountStatus.Active).toBe('active');
      expect(AccountStatus.Expired).toBe('expired');
      expect(AccountStatus.New).toBe('new');
    });
  });
});
