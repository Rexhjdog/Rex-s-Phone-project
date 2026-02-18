/**
 * Secure encrypted storage wrapper.
 * Uses react-native-encrypted-storage for sensitive data
 * and AsyncStorage for non-sensitive preferences.
 */

import { Platform } from 'react-native';

// Dynamic imports to handle when native modules aren't available
let EncryptedStorage: {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
} | null = null;

let AsyncStorage: {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  multiGet: (keys: string[]) => Promise<[string, string | null][]>;
  multiSet: (keyValuePairs: [string, string][]) => Promise<void>;
  multiRemove: (keys: string[]) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  clear: () => Promise<void>;
} | null = null;

try {
  EncryptedStorage = require('react-native-encrypted-storage').default;
} catch {
  // Fallback handled below
}

try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  // Fallback handled below
}

const STORAGE_PREFIX = '@mullvad:';

/**
 * In-memory fallback when native storage isn't available.
 */
class MemoryStorage {
  private store: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

const memoryStorage = new MemoryStorage();

export class SecureStorage {
  /**
   * Store a value securely (encrypted on device).
   * Use for sensitive data: tokens, keys, account info.
   */
  async set(key: string, value: string): Promise<void> {
    const prefixedKey = STORAGE_PREFIX + key;

    try {
      if (EncryptedStorage) {
        await EncryptedStorage.setItem(prefixedKey, value);
      } else {
        await memoryStorage.setItem(prefixedKey, value);
      }
    } catch (error) {
      // Fallback to memory storage
      await memoryStorage.setItem(prefixedKey, value);
    }
  }

  /**
   * Retrieve a securely stored value.
   */
  async get(key: string): Promise<string | null> {
    const prefixedKey = STORAGE_PREFIX + key;

    try {
      if (EncryptedStorage) {
        return await EncryptedStorage.getItem(prefixedKey);
      }
      return await memoryStorage.getItem(prefixedKey);
    } catch {
      return await memoryStorage.getItem(prefixedKey);
    }
  }

  /**
   * Remove a securely stored value.
   */
  async remove(key: string): Promise<void> {
    const prefixedKey = STORAGE_PREFIX + key;

    try {
      if (EncryptedStorage) {
        await EncryptedStorage.removeItem(prefixedKey);
      }
      await memoryStorage.removeItem(prefixedKey);
    } catch {
      await memoryStorage.removeItem(prefixedKey);
    }
  }

  /**
   * Clear all secure storage.
   */
  async clearAll(): Promise<void> {
    try {
      if (EncryptedStorage) {
        await EncryptedStorage.clear();
      }
      await memoryStorage.clear();
    } catch {
      await memoryStorage.clear();
    }
  }
}

/**
 * Non-encrypted storage for preferences and settings.
 */
export class PreferenceStorage {
  /**
   * Store a preference value.
   */
  async set(key: string, value: string): Promise<void> {
    const prefixedKey = STORAGE_PREFIX + key;

    try {
      if (AsyncStorage) {
        await AsyncStorage.setItem(prefixedKey, value);
      } else {
        await memoryStorage.setItem(prefixedKey, value);
      }
    } catch {
      await memoryStorage.setItem(prefixedKey, value);
    }
  }

  /**
   * Get a preference value.
   */
  async get(key: string): Promise<string | null> {
    const prefixedKey = STORAGE_PREFIX + key;

    try {
      if (AsyncStorage) {
        return await AsyncStorage.getItem(prefixedKey);
      }
      return await memoryStorage.getItem(prefixedKey);
    } catch {
      return await memoryStorage.getItem(prefixedKey);
    }
  }

  /**
   * Remove a preference.
   */
  async remove(key: string): Promise<void> {
    const prefixedKey = STORAGE_PREFIX + key;

    try {
      if (AsyncStorage) {
        await AsyncStorage.removeItem(prefixedKey);
      }
      await memoryStorage.removeItem(prefixedKey);
    } catch {
      await memoryStorage.removeItem(prefixedKey);
    }
  }

  /**
   * Get a JSON-parsed value.
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Store a JSON-serialized value.
   */
  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }
}
