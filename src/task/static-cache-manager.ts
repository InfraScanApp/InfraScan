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
   * Uses safe property access to prevent crashes on undefined/null data
   */
  private identifyChanges(oldData: StaticHardwareData, newData: StaticHardwareData): string[] {
    const changes: string[] = [];

    // CPU changes - safe property access
    if (oldData?.cpu && newData?.cpu) {
      if ((oldData.cpu.model || '') !== (newData.cpu.model || '')) {
        changes.push(`CPU Model: ${oldData.cpu.model || 'Unknown'} → ${newData.cpu.model || 'Unknown'}`);
      }
      if ((oldData.cpu.coresPhysical || 0) !== (newData.cpu.coresPhysical || 0)) {
        changes.push(`CPU Cores: ${oldData.cpu.coresPhysical || 0} → ${newData.cpu.coresPhysical || 0}`);
      }
    }

    // RAM changes - safe property access
    if (oldData?.ram && newData?.ram) {
      if ((oldData.ram.totalMB || 0) !== (newData.ram.totalMB || 0)) {
        const oldGB = Math.round((oldData.ram.totalMB || 0) / 1024);
        const newGB = Math.round((newData.ram.totalMB || 0) / 1024);
        changes.push(`RAM: ${oldGB}GB → ${newGB}GB`);
      }
      if ((oldData.ram.type || '') !== (newData.ram.type || '')) {
        changes.push(`RAM Type: ${oldData.ram.type || 'Unknown'} → ${newData.ram.type || 'Unknown'}`);
      }
    }

    // Storage changes - safe property access
    if (oldData?.storage && newData?.storage) {
      if ((oldData.storage.totalGB || 0) !== (newData.storage.totalGB || 0)) {
        changes.push(`Storage: ${oldData.storage.totalGB || 0}GB → ${newData.storage.totalGB || 0}GB`);
      }
      if ((oldData.storage.devices?.length || 0) !== (newData.storage.devices?.length || 0)) {
        changes.push(`Storage Devices: ${oldData.storage.devices?.length || 0} → ${newData.storage.devices?.length || 0}`);
      }
    }

    // GPU changes - safe property access
    if (oldData?.gpu && newData?.gpu) {
      if ((oldData.gpu.present ?? false) !== (newData.gpu.present ?? false)) {
        changes.push(`GPU: ${oldData.gpu.present ? 'Present' : 'None'} → ${newData.gpu.present ? 'Present' : 'None'}`);
      }
      if (oldData.gpu.present && newData.gpu.present && (oldData.gpu.model || '') !== (newData.gpu.model || '')) {
        changes.push(`GPU Model: ${oldData.gpu.model || 'Unknown'} → ${newData.gpu.model || 'Unknown'}`);
      }
    }

    // OS changes - safe property access
    if (oldData?.os && newData?.os) {
      if ((oldData.os.platform || '') !== (newData.os.platform || '')) {
        changes.push(`OS Platform: ${oldData.os.platform || 'Unknown'} → ${newData.os.platform || 'Unknown'}`);
      }
      if ((oldData.os.distro || '') !== (newData.os.distro || '')) {
        changes.push(`OS Version: ${oldData.os.distro || 'Unknown'} → ${newData.os.distro || 'Unknown'}`);
      }
      if ((oldData.os.isVirtual ?? false) !== (newData.os.isVirtual ?? false)) {
        changes.push(`Virtualization: ${oldData.os.isVirtual ? 'Virtual' : 'Physical'} → ${newData.os.isVirtual ? 'Virtual' : 'Physical'}`);
      }
    }

    // Network changes - safe property access
    if (oldData?.network && newData?.network) {
      if ((oldData.network.nicModel || '') !== (newData.network.nicModel || '')) {
        changes.push(`Network: ${oldData.network.nicModel || 'Unknown'} → ${newData.network.nicModel || 'Unknown'}`);
      }
    }

    // System architecture changes - safe property access
    if (oldData?.system && newData?.system) {
      if ((oldData.system.arch || '') !== (newData.system.arch || '')) {
        changes.push(`Architecture: ${oldData.system.arch || 'Unknown'} → ${newData.system.arch || 'Unknown'}`);
      }
      if ((oldData.system.hostname || '') !== (newData.system.hostname || '')) {
        changes.push(`Hostname: ${oldData.system.hostname || 'Unknown'} → ${newData.system.hostname || 'Unknown'}`);
      }
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