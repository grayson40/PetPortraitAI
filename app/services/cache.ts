import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheConfig {
  expirationTime: number; // in milliseconds
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  expirationTime: 5 * 60 * 1000, // 5 minutes default
};

export class CacheService {
  private static instance: CacheService;
  private config: CacheConfig;

  private constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
  }

  static getInstance(config?: CacheConfig): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  async set<T>(key: string, data: T, customExpiration?: number): Promise<void> {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > this.config.expirationTime;

      if (isExpired) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  }
} 