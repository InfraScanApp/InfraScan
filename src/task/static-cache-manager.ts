import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { StaticHardwareData, HardwareDetection } from './hardware-detection';

export interface CachedStaticData {
  data: StaticHardwareData;
  hash: string;
  timestamp: number;
  lastUpdated: string;
}

export interface StaticChangeResult {
  hasChanged: boolean;
  currentData: StaticHardwareData;
  previousData?: StaticHardwareData;
  reason?: string;
}

export class StaticCacheManager {
  private static instance: StaticCacheManager;
  private readonly cacheFilePath: string;
  private hardwareDetection: HardwareDetection;

  private constructor() {
    // Store cache file relative to this module's directory for consistent path resolution
    this.cacheFilePath = resolve(__dirname, '.staticCache.json');
    this.hardwareDetection = HardwareDetection.getInstance();
  }

  public static getInstance(): StaticCacheManager {
    if (!StaticCacheManager.instance) {
      StaticCacheManager.instance = new StaticCacheManager();
    }
    return StaticCacheManager.instance;
  }

  /**
   * Load cached static data from file
   */
  public async loadCachedData(): Promise<CachedStaticData | null> {
    try {
      const fileExists = await this.fileExists(this.cacheFilePath);
      if (!fileExists) {
        console.log('Static Cache: No cache file found, first run detected');
        return null;
      }

      const fileContent = await fs.readFile(this.cacheFilePath, 'utf-8');
      const cachedData: CachedStaticData = JSON.parse(fileContent);
      
      console.log(`Static Cache: Loaded cached data from ${cachedData.lastUpdated}`);
      return cachedData;
    } catch (error) {
      console.error('Static Cache: Failed to load cached data:', error);
      return null;
    }
  }

  /**
   * Save static data to cache file
   */
  public async saveCachedData(data: StaticHardwareData): Promise<void> {
    try {
      const hash = this.hardwareDetection.generateDataHash(data);
      const cachedData: CachedStaticData = {
        data,
        hash,
        timestamp: Date.now(),
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(this.cacheFilePath, JSON.stringify(cachedData, null, 2), 'utf-8');
      console.log(`Static Cache: Saved static data to cache file`);
    } catch (error) {
      console.error('Static Cache: Failed to save cached data:', error);
      throw error;
    }
  }

  /**
   * Check if static hardware data has changed compared to cached version
   */
  public async checkForStaticChanges(): Promise<StaticChangeResult> {
    try {
      // Collect current hardware data
      const currentData = await this.hardwareDetection.collectStaticData();
      const currentHash = this.hardwareDetection.generateDataHash(currentData);

      // Load cached data
      const cachedData = await this.loadCachedData();

      // If no cache exists, this is the first run
      if (!cachedData) {
        await this.saveCachedData(currentData);
        return {
          hasChanged: true,
          currentData,
          reason: 'First run - no previous data'
        };
      }

      // Compare hashes
      if (currentHash !== cachedData.hash) {
        // Hardware has changed, update cache
        await this.saveCachedData(currentData);
        
        // Find what changed
        const changes = this.identifyChanges(cachedData.data, currentData);
        
        return {
          hasChanged: true,
          currentData,
          previousData: cachedData.data,
          reason: `Hardware changes detected: ${changes.join(', ')}`
        };
      }

      // No changes detected
      return {
        hasChanged: false,
        currentData,
        previousData: cachedData.data,
        reason: 'No hardware changes detected'
      };
    } catch (error) {
      console.error('Static Cache: Failed to check for static changes:', error);
      
      // In case of error, collect current data and assume it changed
      const currentData = await this.hardwareDetection.collectStaticData();
      return {
        hasChanged: true,
        currentData,
        reason: 'Error checking cache - assuming changed'
      };
    }
  }

  /**
   * Identify specific changes between old and new static data
   */
  private identifyChanges(oldData: StaticHardwareData, newData: StaticHardwareData): string[] {
    const changes: string[] = [];

    if (oldData.cpuModel !== newData.cpuModel) {
      changes.push(`CPU: ${oldData.cpuModel} → ${newData.cpuModel}`);
    }

    if (oldData.ramSize !== newData.ramSize) {
      changes.push(`RAM: ${oldData.ramSize}GB → ${newData.ramSize}GB`);
    }

    if (oldData.ssdType !== newData.ssdType) {
      changes.push(`Storage: ${oldData.ssdType} → ${newData.ssdType}`);
    }

    if (oldData.osType !== newData.osType) {
      changes.push(`OS Type: ${oldData.osType} → ${newData.osType}`);
    }

    if (oldData.osVersion !== newData.osVersion) {
      changes.push(`OS Version: ${oldData.osVersion} → ${newData.osVersion}`);
    }

    if (oldData.nodeArch !== newData.nodeArch) {
      changes.push(`Architecture: ${oldData.nodeArch} → ${newData.nodeArch}`);
    }

    return changes;
  }

  /**
   * Get current cached data for inspection
   */
  public async getCurrentCachedData(): Promise<CachedStaticData | null> {
    return await this.loadCachedData();
  }

  /**
   * Force refresh of static data (useful for testing or after maintenance)
   */
  public async forceRefresh(): Promise<StaticHardwareData> {
    try {
      const currentData = await this.hardwareDetection.collectStaticData();
      await this.saveCachedData(currentData);
      console.log('Static Cache: Forced refresh of static data');
      return currentData;
    } catch (error) {
      console.error('Static Cache: Failed to force refresh:', error);
      throw error;
    }
  }

  /**
   * Clear cache file (useful for testing)
   */
  public async clearCache(): Promise<void> {
    try {
      const fileExists = await this.fileExists(this.cacheFilePath);
      if (fileExists) {
        await fs.unlink(this.cacheFilePath);
        console.log('Static Cache: Cache file cleared');
      }
    } catch (error) {
      console.error('Static Cache: Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache file status
   */
  public async getCacheStatus(): Promise<{
    exists: boolean;
    size?: number;
    lastModified?: Date;
    path: string;
  }> {
    try {
      const exists = await this.fileExists(this.cacheFilePath);
      
      if (exists) {
        const stats = await fs.stat(this.cacheFilePath);
        return {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime,
          path: this.cacheFilePath
        };
      } else {
        return {
          exists: false,
          path: this.cacheFilePath
        };
      }
    } catch (error) {
      console.error('Static Cache: Failed to get cache status:', error);
      return {
        exists: false,
        path: this.cacheFilePath
      };
    }
  }

  /**
   * Utility method to check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
} 