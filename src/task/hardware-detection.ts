import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { platform } from 'os';

const execAsync = promisify(exec);

export interface StaticHardwareData {
  cpuModel: string;
  ramSize: number; // in GB
  ssdType: string;
  osType: string;
  osVersion: string;
  nodeArch: string;
}

export class HardwareDetection {
  private static instance: HardwareDetection;

  private constructor() {}

  public static getInstance(): HardwareDetection {
    if (!HardwareDetection.instance) {
      HardwareDetection.instance = new HardwareDetection();
    }
    return HardwareDetection.instance;
  }

  /**
   * Collect all static hardware information
   */
  public async collectStaticData(): Promise<StaticHardwareData> {
    try {
      const [cpuModel, ramSize, ssdType, osInfo] = await Promise.all([
        this.getCPUModel(),
        this.getRAMSize(),
        this.getStorageType(),
        this.getOSInfo()
      ]);

      return {
        cpuModel,
        ramSize,
        ssdType,
        osType: osInfo.type,
        osVersion: osInfo.version,
        nodeArch: process.arch
      };
    } catch (error) {
      console.error('Hardware Detection: Failed to collect static data:', error);
      throw error;
    }
  }

  /**
   * Get CPU model information
   */
  private async getCPUModel(): Promise<string> {
    try {
      const osType = platform();
      
      if (osType === 'linux') {
        const { stdout } = await execAsync('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2');
        return stdout.trim() || 'Unknown Linux CPU';
      } else if (osType === 'darwin') {
        const { stdout } = await execAsync('sysctl -n machdep.cpu.brand_string');
        return stdout.trim() || 'Unknown macOS CPU';
      } else if (osType === 'win32') {
        const { stdout } = await execAsync('wmic cpu get name /value | findstr Name=');
        const match = stdout.match(/Name=(.+)/);
        return match ? match[1].trim() : 'Unknown Windows CPU';
      } else {
        return `Unknown CPU (${osType})`;
      }
    } catch (error) {
      console.error('Hardware Detection: Failed to get CPU model:', error);
      return 'CPU Detection Failed';
    }
  }

  /**
   * Get RAM size in GB
   */
  private async getRAMSize(): Promise<number> {
    try {
      const osType = platform();
      
      if (osType === 'linux') {
        const { stdout } = await execAsync('cat /proc/meminfo | grep MemTotal | awk \'{print $2}\'');
        const ramKB = parseInt(stdout.trim());
        return Math.round(ramKB / 1024 / 1024); // Convert KB to GB
      } else if (osType === 'darwin') {
        const { stdout } = await execAsync('sysctl -n hw.memsize');
        const ramBytes = parseInt(stdout.trim());
        return Math.round(ramBytes / 1024 / 1024 / 1024); // Convert bytes to GB
      } else if (osType === 'win32') {
        const { stdout } = await execAsync('wmic computersystem get TotalPhysicalMemory /value | findstr TotalPhysicalMemory=');
        const match = stdout.match(/TotalPhysicalMemory=(\d+)/);
        if (match) {
          const ramBytes = parseInt(match[1]);
          return Math.round(ramBytes / 1024 / 1024 / 1024); // Convert bytes to GB
        }
        return 0;
      } else {
        return 0;
      }
    } catch (error) {
      console.error('Hardware Detection: Failed to get RAM size:', error);
      return 0;
    }
  }

  /**
   * Get storage type (SSD/HDD)
   */
  private async getStorageType(): Promise<string> {
    try {
      const osType = platform();
      
      if (osType === 'linux') {
        // Try to detect SSD using multiple methods
        try {
          const { stdout: lsblkOutput } = await execAsync('lsblk -d -o name,rota | grep -v NAME');
          const devices = lsblkOutput.split('\n').filter(line => line.trim());
          
          const ssdDevices = devices.filter(device => device.includes('0')); // rota=0 means SSD
          const hddDevices = devices.filter(device => device.includes('1')); // rota=1 means HDD
          
          if (ssdDevices.length > 0 && hddDevices.length === 0) {
            return 'SSD';
          } else if (hddDevices.length > 0 && ssdDevices.length === 0) {
            return 'HDD';
          } else if (ssdDevices.length > 0 && hddDevices.length > 0) {
            return 'Mixed (SSD + HDD)';
          }
        } catch (lsblkError) {
          // Fallback method
          try {
            const { stdout } = await execAsync('cat /sys/block/sda/queue/rotational 2>/dev/null || echo "unknown"');
            return stdout.trim() === '0' ? 'SSD' : 'HDD';
          } catch {
            return 'Unknown Storage';
          }
        }
      } else if (osType === 'darwin') {
        const { stdout } = await execAsync('system_profiler SPStorageDataType | grep "Medium Type" | head -1');
        if (stdout.includes('Solid State')) {
          return 'SSD';
        } else if (stdout.includes('Rotational')) {
          return 'HDD';
        } else {
          return 'Unknown Storage';
        }
      } else if (osType === 'win32') {
        const { stdout } = await execAsync('wmic diskdrive get MediaType /value | findstr MediaType=');
        if (stdout.includes('SSD')) {
          return 'SSD';
        } else if (stdout.includes('HDD')) {
          return 'HDD';
        } else {
          return 'Unknown Storage';
        }
      }
      
      return 'Unknown Storage';
    } catch (error) {
      console.error('Hardware Detection: Failed to get storage type:', error);
      return 'Storage Detection Failed';
    }
  }

  /**
   * Get OS information
   */
  private async getOSInfo(): Promise<{ type: string; version: string }> {
    try {
      const osType = platform();
      let version = 'Unknown';
      
      if (osType === 'linux') {
        try {
          const { stdout } = await execAsync('lsb_release -d | cut -f2 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'');
          version = stdout.trim() || 'Unknown Linux';
        } catch {
          version = 'Unknown Linux';
        }
      } else if (osType === 'darwin') {
        try {
          const { stdout } = await execAsync('sw_vers -productVersion');
          version = `macOS ${stdout.trim()}`;
        } catch {
          version = 'Unknown macOS';
        }
      } else if (osType === 'win32') {
        try {
          const { stdout } = await execAsync('wmic os get Caption /value | findstr Caption=');
          const match = stdout.match(/Caption=(.+)/);
          version = match ? match[1].trim() : 'Unknown Windows';
        } catch {
          version = 'Unknown Windows';
        }
      }
      
      return {
        type: osType,
        version
      };
    } catch (error) {
      console.error('Hardware Detection: Failed to get OS info:', error);
      return {
        type: platform(),
        version: 'OS Detection Failed'
      };
    }
  }

  /**
   * Generate a hash of the static data for change detection
   */
  public generateDataHash(data: StaticHardwareData): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
} 