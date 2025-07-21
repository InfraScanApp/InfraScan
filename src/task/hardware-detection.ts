import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { platform, arch, hostname, networkInterfaces, uptime } from 'os';
import * as https from 'https';

const execAsync = promisify(exec);

export interface StaticHardwareData {
  wanIp: string;
  lanIp: string;
  cpu: {
    model: string;
    coresPhysical: number;
    coresLogical: number;
    frequencyGHz?: number;
  };
  ram: {
    totalMB: number;
    type?: string;
    config?: object[];
  };
  storage: {
    totalGB: number;
    devices: object[];
  };
  gpu: {
    present: boolean;
    vendor?: string;
    model?: string;
    vramMB?: number;
    driverVersion?: string;
    processor?: string;
  };
  os: {
    platform: string;
    distro?: string;
    kernel?: string;
    isVirtual: boolean;
    virtualPlatform?: string;
  };
  network: {
    nicModel?: string;
    speedMbps?: number;
    mediaType?: string;
  };
  system: {
    arch: string;
    hostname: string;
    swapTotalMB?: number;
    bootUptimeSeconds?: number;
  };
}

export class HardwareDetection {
  private static instance: HardwareDetection;
  private osType: string;

  private constructor() {
    this.osType = platform();
  }

  /**
   * Utility method for reliable Windows PowerShell execution
   * Follows your clean execSync pattern
   */
  private executeWindowsCommand(command: string, timeout: number = 8000): string {
    return execSync(
      `powershell -Command "${command}"`,
      { encoding: 'utf-8', timeout }
    );
  }

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
      console.log('🔍 Starting comprehensive hardware detection...');
      
      const [
        wanIp,
        lanIp,
        cpuData,
        ramData,
        storageData,
        gpuData,
        osData,
        networkData,
        systemData
      ] = await Promise.all([
        this.getWanIp(),
        this.getLanIp(),
        this.getCpuInfo(),
        this.getRamInfo(),
        this.getStorageInfo(),
        this.getGpuInfo(),
        this.getOsInfo(),
        this.getNetworkInfo(),
        this.getSystemInfo()
      ]);

      const data: StaticHardwareData = {
        wanIp,
        lanIp,
        cpu: cpuData,
        ram: ramData,
        storage: storageData,
        gpu: gpuData,
        os: osData,
        network: networkData,
        system: systemData
      };

      console.log('✅ Hardware detection completed successfully');
      return data;
    } catch (error) {
      console.error('❌ Hardware Detection: Failed to collect static data:', error);
      throw error;
    }
  }

  /**
   * Get WAN IP address using external API
   */
  private async getWanIp(): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = https.get('https://api.ipify.org?format=json', (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.ip || 'unknown');
          } catch (error) {
            resolve('unknown');
          }
        });
      });
      
      request.on('error', () => resolve('unknown'));
      request.setTimeout(5000, () => {
        request.destroy();
        resolve('unknown');
      });
    });
  }

  /**
   * Get LAN IP address using Node.js network interfaces
   */
  private getLanIp(): string {
    try {
      const interfaces = networkInterfaces();
      
      for (const name of Object.keys(interfaces)) {
        const iface = interfaces[name];
        if (iface) {
          for (const config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
              return config.address;
            }
          }
        }
      }
      return 'unknown';
    } catch (error) {
      console.warn('[Hardware Detection] LAN IP detection failed - network interface or permission issue:', error instanceof Error ? error.message : String(error));
      return 'unknown';
    }
  }

  /**
   * Get detailed CPU information
   */
  private async getCpuInfo(): Promise<StaticHardwareData['cpu']> {
    try {
      if (this.osType === 'win32') {
        return await this.getCpuInfoWindows();
      } else if (this.osType === 'darwin') {
        return await this.getCpuInfoMacOS();
      } else {
        return await this.getCpuInfoLinux();
      }
    } catch (error) {
      console.warn('[Hardware Detection] CPU detection failed - command unavailable or system incompatible:', error instanceof Error ? error.message : String(error));
      return {
        model: 'Unknown CPU',
        coresPhysical: 1,
        coresLogical: 1
      };
    }
  }

  private async getCpuInfoWindows(): Promise<StaticHardwareData['cpu']> {
    // Windows CPU detection using your clean pattern
    let cpuInfo = null;
    try {
      cpuInfo = execSync(
        'powershell -Command "Get-CimInstance Win32_Processor | Select Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed | ConvertTo-Json"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    if (cpuInfo) {
      try {
        const cpuData = JSON.parse(cpuInfo);
        const cpu = Array.isArray(cpuData) ? cpuData[0] : cpuData;

        return {
          model: cpu.Name?.trim() || 'Unknown Windows CPU',
          coresPhysical: cpu.NumberOfCores || 1,
          coresLogical: cpu.NumberOfLogicalProcessors || 1,
          frequencyGHz: cpu.MaxClockSpeed ? parseFloat((cpu.MaxClockSpeed / 1000).toFixed(2)) : undefined
        };
      } catch {}
    }
    
    // Simple fallback using your clean pattern
    let cpuName = null;
    try {
      cpuName = execSync(
        'powershell -Command "Get-CimInstance Win32_Processor | Select -ExpandProperty Name"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    return {
      model: cpuName || 'CPU Detection Failed',
      coresPhysical: 1,
      coresLogical: 1
    };
  }

  private async getCpuInfoMacOS(): Promise<StaticHardwareData['cpu']> {
    // macOS CPU detection using your clean pattern
    let cpuModel: string | null = null;
    let physicalCores: number = 1;
    let logicalCores: number = 1;
    
    try {
      cpuModel = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf-8' }).trim();
    } catch {}
    
    try {
      const coreInfo = execSync('sysctl -n hw.physicalcpu hw.logicalcpu', { encoding: 'utf-8' }).trim().split('\n');
      physicalCores = parseInt(coreInfo[0]) || 1;
      logicalCores = parseInt(coreInfo[1]) || 1;
    } catch {}
    
    return {
      model: cpuModel || 'Unknown macOS CPU',
      coresPhysical: physicalCores,
      coresLogical: logicalCores
    };
  }

  private async getCpuInfoLinux(): Promise<StaticHardwareData['cpu']> {
    // Linux CPU detection using your clean pattern
    let cpuInfo: string | null = null;
    try {
      cpuInfo = execSync('lscpu', { encoding: 'utf-8' });
    } catch {
      return {
        model: 'Linux CPU Detection Failed',
        coresPhysical: 1,
        coresLogical: 1
      };
    }
    
    const lines = cpuInfo.split('\n');
    
    const getField = (field: string) => {
      const line = lines.find(l => l.includes(field));
      return line ? line.split(':')[1]?.trim() : null;
    };
    
    const model = getField('Model name') || 'Unknown Linux CPU';
    const coresPhysical = parseInt(getField('Core(s) per socket') || '1') * parseInt(getField('Socket(s)') || '1');
    const coresLogical = parseInt(getField('CPU(s)') || '1');
    const freqStr = getField('CPU MHz');
    const frequencyGHz = freqStr ? parseFloat((parseFloat(freqStr) / 1000).toFixed(2)) : undefined;
    
    return {
      model,
      coresPhysical,
      coresLogical,
      frequencyGHz
    };
  }

  /**
   * Get detailed RAM information
   */
  private async getRamInfo(): Promise<StaticHardwareData['ram']> {
    try {
      if (this.osType === 'win32') {
        return await this.getRamInfoWindows();
      } else if (this.osType === 'darwin') {
        return await this.getRamInfoMacOS();
      } else {
        return await this.getRamInfoLinux();
      }
    } catch (error) {
      console.error('Failed to get RAM info:', error);
      return { totalMB: 0 };
    }
  }

  private async getRamInfoWindows(): Promise<StaticHardwareData['ram']> {
    // Windows RAM detection using your clean pattern
    let memoryInfo = null;
    try {
      memoryInfo = execSync(
        'powershell -Command "Get-CimInstance Win32_PhysicalMemory | Select Capacity, MemoryType, Speed, Tag | ConvertTo-Json"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    if (memoryInfo) {
      try {
        const memData = JSON.parse(memoryInfo);
        const modules = Array.isArray(memData) ? memData : [memData];
        
        const totalMB = modules.reduce((sum, module) => {
          const capacity = parseInt(module.Capacity) || 0;
          return sum + (capacity / 1024 / 1024);
        }, 0);

        const type = this.getMemoryType(modules[0]?.MemoryType);
        
        return {
          totalMB: Math.round(totalMB),
          type,
          config: modules.map(m => ({
            capacityMB: Math.round((parseInt(m.Capacity) || 0) / 1024 / 1024),
            speed: m.Speed || 'Unknown',
            slot: m.Tag || 'Unknown'
          }))
        };
      } catch {}
    }
    
    // Fallback using your clean pattern
    let totalRAM = null;
    try {
      totalRAM = execSync(
        'powershell -Command "Get-CimInstance Win32_ComputerSystem | Select -ExpandProperty TotalPhysicalMemory"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    if (totalRAM) {
      const totalRAMMB = Math.floor(Number(totalRAM) / 1024 / 1024);
      if (totalRAMMB > 0) {
        return { 
          totalMB: totalRAMMB,
          type: 'Unknown'
        };
      }
    }
    
    return { totalMB: 0 };
  }

  private async getRamInfoMacOS(): Promise<StaticHardwareData['ram']> {
    const { stdout } = await execAsync('system_profiler SPMemoryDataType -json');
    const data = JSON.parse(stdout);
    const memData = data.SPMemoryDataType?.[0];
    
    if (!memData) {
      const { stdout: memSize } = await execAsync('sysctl -n hw.memsize');
      return { totalMB: Math.round(parseInt(memSize) / 1024 / 1024) };
    }
    
    return {
      totalMB: Math.round(parseInt(memData.dimm_size?.replace(/\D/g, '') || '0')),
      type: memData.dimm_type || 'Unknown'
    };
  }

  private async getRamInfoLinux(): Promise<StaticHardwareData['ram']> {
    try {
      // Try dmidecode first for detailed info
      const { stdout: dmidecode } = await execAsync('sudo dmidecode -t memory 2>/dev/null || dmidecode -t memory 2>/dev/null');
      const { stdout: meminfo } = await execAsync('cat /proc/meminfo | grep MemTotal');
      
      const totalKB = parseInt(meminfo.match(/MemTotal:\s+(\d+)/)?.[1] || '0');
      const totalMB = Math.round(totalKB / 1024);
      
      // Parse dmidecode output for detailed info
      const modules = [];
      const moduleBlocks = dmidecode.split('Memory Device');
      
      for (const block of moduleBlocks.slice(1)) {
        const sizeMatch = block.match(/Size:\s+(\d+)\s+(\w+)/);
        const typeMatch = block.match(/Type:\s+(\w+)/);
        const speedMatch = block.match(/Speed:\s+(\d+)/);
        
        if (sizeMatch) {
          modules.push({
            capacityMB: sizeMatch[2] === 'GB' ? parseInt(sizeMatch[1]) * 1024 : parseInt(sizeMatch[1]),
            type: typeMatch?.[1] || 'Unknown',
            speed: speedMatch?.[1] ? `${speedMatch[1]} MHz` : 'Unknown'
          });
        }
      }
      
      return {
        totalMB,
        type: modules[0]?.type || 'Unknown',
        config: modules.length > 0 ? modules : undefined
      };
    } catch (error) {
      // Fallback to basic memory info
      const { stdout } = await execAsync('cat /proc/meminfo | grep MemTotal');
      const totalKB = parseInt(stdout.match(/MemTotal:\s+(\d+)/)?.[1] || '0');
      return { totalMB: Math.round(totalKB / 1024) };
    }
  }

  private getMemoryType(typeCode: number): string {
    const types: { [key: number]: string } = {
      20: 'DDR',
      21: 'DDR2',
      24: 'DDR3',
      26: 'DDR4',
      34: 'DDR5'
    };
    return types[typeCode] || 'Unknown';
  }

  /**
   * Get storage information
   */
  private async getStorageInfo(): Promise<StaticHardwareData['storage']> {
    try {
      if (this.osType === 'win32') {
        return await this.getStorageInfoWindows();
      } else if (this.osType === 'darwin') {
        return await this.getStorageInfoMacOS();
      } else {
        return await this.getStorageInfoLinux();
      }
    } catch (error) {
      console.warn('[Hardware Detection] Storage detection failed - command unavailable or permissions:', error instanceof Error ? error.message : String(error));
      return { totalGB: 0, devices: [] };
    }
  }

  private async getStorageInfoWindows(): Promise<StaticHardwareData['storage']> {
    // Windows storage detection using your clean pattern
    let storageInfo = null;
    try {
      storageInfo = execSync(
        'powershell -Command "Get-PhysicalDisk | Select MediaType, Size, FriendlyName, BusType | ConvertTo-Json"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    if (storageInfo) {
      try {
        const disks = JSON.parse(storageInfo);
        const diskArray = Array.isArray(disks) ? disks : [disks];
        
        // Filter valid disks and calculate total
        const validDisks = diskArray.filter(disk => disk.Size && parseInt(disk.Size) > 0);
        
        if (validDisks.length > 0) {
          const totalGB = validDisks.reduce((sum, disk) => {
            return sum + (parseInt(disk.Size) / (1024 * 1024 * 1024));
          }, 0);

          const devices = validDisks.map(disk => {
            const sizeGB = Math.round(parseInt(disk.Size) / (1024 * 1024 * 1024));
            let type = disk.MediaType || 'Unknown';
            
            // Enhanced type detection
            if (disk.BusType === 'NVMe') {
              type = 'NVMe SSD';
            } else if (type === 'SSD') {
              type = 'SATA SSD';
            } else if (type === 'HDD' || type === 'Unspecified') {
              type = 'HDD';
            }
            
            return {
              name: disk.FriendlyName || 'Unknown Disk',
              sizeGB,
              type,
              busType: disk.BusType || 'Unknown'
            };
          });

          return {
            totalGB: Math.round(totalGB),
            devices
          };
        }
      } catch {}
    }

    // Fallback using your clean pattern
    let volumeInfo = null;
    try {
      volumeInfo = execSync(
        'powershell -Command "Get-Volume | Where {$_.DriveType -eq \'Fixed\'} | Select Size, DriveLetter | ConvertTo-Json"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    if (volumeInfo) {
      try {
        const volumes = JSON.parse(volumeInfo);
        const volumeArray = Array.isArray(volumes) ? volumes : [volumes];
        
        const validVolumes = volumeArray.filter(vol => vol.Size && parseInt(vol.Size) > 0);
        const totalGB = validVolumes.reduce((sum, volume) => {
          return sum + (parseInt(volume.Size) / (1024 * 1024 * 1024));
        }, 0);

        return {
          totalGB: Math.round(totalGB),
          devices: validVolumes.map(volume => ({
            name: `Drive ${volume.DriveLetter || 'Unknown'}:`,
            sizeGB: Math.round(parseInt(volume.Size) / (1024 * 1024 * 1024)),
            type: 'Unknown',
            busType: 'Unknown'
          }))
        };
      } catch {}
    }

    return { totalGB: 0, devices: [] };
  }

  private async getStorageInfoMacOS(): Promise<StaticHardwareData['storage']> {
    const { stdout } = await execAsync('diskutil list -plist');
    // Basic implementation - could be enhanced with proper plist parsing
    const { stdout: df } = await execAsync('df -h | grep "^/dev"');
    
    const lines = df.split('\n').filter(line => line.trim());
    const devices = lines.map(line => {
      const parts = line.split(/\s+/);
      return {
        device: parts[0],
        sizeGB: this.parseSize(parts[1]),
        type: 'Unknown'
      };
    });
    
    const totalGB = devices.reduce((sum, device) => sum + device.sizeGB, 0);
    
    return { totalGB: Math.round(totalGB), devices };
  }

  private async getStorageInfoLinux(): Promise<StaticHardwareData['storage']> {
    const [lsblkResult, dfResult] = await Promise.all([
      execAsync('lsblk -d -o NAME,SIZE,ROTA,TYPE | grep disk'),
      execAsync('df -h | grep "^/dev"')
    ]);
    
    const devices = lsblkResult.stdout.split('\n').filter(line => line.trim()).map(line => {
      const parts = line.split(/\s+/);
      return {
        name: parts[0],
        sizeGB: this.parseSize(parts[1]),
        type: parts[2] === '0' ? 'SSD' : 'HDD'
      };
    });
    
    const totalGB = devices.reduce((sum, device) => sum + device.sizeGB, 0);
    
    return { totalGB: Math.round(totalGB), devices };
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^([\d.]+)([KMGT]?)/);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'T': return num * 1024;
      case 'G': return num;
      case 'M': return num / 1024;
      case 'K': return num / 1024 / 1024;
      default: return num / 1024 / 1024 / 1024;
    }
  }

  /**
   * Get GPU information
   */
  private async getGpuInfo(): Promise<StaticHardwareData['gpu']> {
    const gpu: StaticHardwareData['gpu'] = { present: true };
    
    try {
      if (this.osType === 'win32') {
        return await this.getGpuInfoWindows();
      } else if (this.osType === 'darwin') {
        return await this.getGpuInfoMacOS();
      } else {
        return await this.getGpuInfoLinux();
      }
    } catch (error) {
      console.warn('[Hardware Detection] GPU detection failed - drivers, permissions, or hardware unavailable:', error instanceof Error ? error.message : String(error));
      gpu.present = false;
      return gpu;
    }
  }

  private async getGpuInfoWindows(): Promise<StaticHardwareData['gpu']> {
    // Windows GPU detection using your clean property assignment pattern
    const gpu: StaticHardwareData['gpu'] = { present: true };
    
    let gpuInfo = null;
    try {
      gpuInfo = execSync(
        'powershell -Command "Get-CimInstance Win32_VideoController | Where {$_.Name -notlike \'*Remote*\' -and $_.Name -notlike \'*RDP*\'} | Select Name, AdapterRAM, DriverVersion, VideoProcessor | ConvertTo-Json"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    if (gpuInfo) {
      try {
        const gpuData = JSON.parse(gpuInfo);
        const gpus = Array.isArray(gpuData) ? gpuData : [gpuData];
        
        // Find the primary/discrete GPU (prefer NVIDIA/AMD over Intel)
        const primaryGpu = gpus.find(gpu => {
          const name = (gpu.Name || '').toLowerCase();
          return name.includes('nvidia') || name.includes('amd') || name.includes('radeon');
        }) || gpus[0];

        if (primaryGpu?.Name) {
          gpu.model = primaryGpu.Name.trim();
          gpu.vendor = this.getGpuVendor(primaryGpu.Name);
          if (primaryGpu.AdapterRAM && primaryGpu.AdapterRAM > 0) {
            gpu.vramMB = Math.round(primaryGpu.AdapterRAM / (1024 * 1024));
          }
          gpu.driverVersion = primaryGpu.DriverVersion || undefined;
          gpu.processor = primaryGpu.VideoProcessor || undefined;
          return gpu;
        }
      } catch {}
    }

    // Fallback using your clean pattern
    let gpuName = null;
    try {
      gpuName = execSync(
        'powershell -Command "Get-CimInstance Win32_VideoController | Select -First 1 -ExpandProperty Name"',
        { encoding: 'utf-8' }
      ).trim();
    } catch {}

    if (gpuName && !gpuName.includes('Remote') && !gpuName.includes('RDP')) {
      gpu.model = gpuName;
      gpu.vendor = this.getGpuVendor(gpuName);
      return gpu;
    }

    gpu.present = false;
    return gpu;
  }

  private async getGpuInfoMacOS(): Promise<StaticHardwareData['gpu']> {
    // macOS GPU detection using your clean property assignment pattern
    const gpu: StaticHardwareData['gpu'] = { present: true };
    
    const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
    const data = JSON.parse(stdout);
    const displays = data.SPDisplaysDataType;
    
    if (!displays || displays.length === 0) {
      gpu.present = false;
      return gpu;
    }
    
    const gpuData = displays[0];
    gpu.model = gpuData.sppci_model || 'Unknown';
    gpu.vendor = this.getGpuVendor(gpuData.sppci_model || '');
    if (gpuData.spdisplays_vram) {
      gpu.vramMB = parseInt(gpuData.spdisplays_vram.replace(/\D/g, ''));
    }
    
    return gpu;
  }

  private async getGpuInfoLinux(): Promise<StaticHardwareData['gpu']> {
    // Linux GPU detection using your clean property assignment pattern
    const gpu: StaticHardwareData['gpu'] = { present: true };
    
    try {
      const { stdout } = await execAsync('lspci | grep -i vga');
      if (!stdout.trim()) {
        gpu.present = false;
        return gpu;
      }
      
      const gpuLine = stdout.split('\n')[0];
      const model = gpuLine.split(': ')[1] || 'Unknown GPU';
      
      gpu.model = model;
      gpu.vendor = this.getGpuVendor(model);
      
      // Try nvidia-smi for NVIDIA cards
      try {
        const { stdout: nvidiaInfo } = await execAsync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits');
        const vramMB = parseInt(nvidiaInfo.trim());
        
        if (vramMB) {
          gpu.vendor = 'NVIDIA';
          gpu.vramMB = vramMB;
        }
      } catch {}
      
      return gpu;
    } catch (error) {
      console.warn('[Hardware Detection] Command failed: lspci not found or permission denied');
      gpu.present = false;
      return gpu;
    }
  }

  private getGpuVendor(model: string): string {
    const modelLower = model.toLowerCase();
    if (modelLower.includes('nvidia') || modelLower.includes('geforce') || modelLower.includes('quadro')) return 'NVIDIA';
    if (modelLower.includes('amd') || modelLower.includes('radeon')) return 'AMD';
    if (modelLower.includes('intel')) return 'Intel';
    return 'Unknown';
  }

  /**
   * Get OS information including virtualization detection
   */
  private async getOsInfo(): Promise<StaticHardwareData['os']> {
    try {
      const [basicInfo, virtInfo] = await Promise.all([
        this.getBasicOsInfo(),
        this.detectVirtualization()
      ]);
      
      return {
        ...basicInfo,
        ...virtInfo
      };
    } catch (error) {
      console.error('Failed to get OS info:', error);
      return {
        platform: this.osType,
        isVirtual: false
      };
    }
  }

  private async getBasicOsInfo(): Promise<{ platform: string; distro?: string; kernel?: string }> {
    if (this.osType === 'linux') {
      try {
        const [distroResult, kernelResult] = await Promise.all([
          execAsync('lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\''),
          execAsync('uname -r')
        ]);
        
        return {
          platform: 'Linux',
          distro: distroResult.stdout.trim() || 'Unknown Linux',
          kernel: kernelResult.stdout.trim()
        };
      } catch {
        return { platform: 'Linux' };
      }
    } else if (this.osType === 'darwin') {
      try {
        const { stdout } = await execAsync('sw_vers -productVersion');
        return {
          platform: 'macOS',
          distro: `macOS ${stdout.trim()}`
        };
      } catch {
        return { platform: 'macOS' };
      }
    } else if (this.osType === 'win32') {
      try {
        // Windows OS detection using your clean pattern
        const osInfo = execSync(
          'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select Caption, Version, BuildNumber | ConvertTo-Json"',
          { encoding: 'utf-8', timeout: 10000 }
        );

        const osData = JSON.parse(osInfo);
        const caption = osData.Caption || 'Windows';
        const version = osData.Version || '';
        const buildNumber = osData.BuildNumber || '';
        
        let distro = caption.trim();
        if (version && buildNumber) {
          distro += ` (${version} Build ${buildNumber})`;
        }

        return {
          platform: 'Windows',
          distro
        };
      } catch (error) {
        console.error('Windows OS detection failed:', error);
        
                  // Fallback to basic detection
          try {
            const osCaption = execSync(
              'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption"',
              { encoding: 'utf-8', timeout: 5000 }
            ).toString().trim();
            
            return {
              platform: 'Windows',
              distro: osCaption || 'Windows'
            };
          } catch {
            return { platform: 'Windows' };
          }
      }
    }
    
    return { platform: this.osType };
  }

  private async detectVirtualization(): Promise<{ isVirtual: boolean; virtualPlatform?: string }> {
    try {
      if (this.osType === 'linux') {
        // Linux virtualization detection using your clean pattern
        let virtPlatform: string | null = null;
        try {
          virtPlatform = execSync('systemd-detect-virt', { encoding: 'utf-8' }).trim();
        } catch {}

        // Try dmidecode fallback if systemd-detect-virt didn't work
        if (!virtPlatform || virtPlatform === 'none') {
          try {
            const product = execSync('dmidecode -s system-product-name 2>/dev/null', { encoding: 'utf-8' }).toLowerCase();
            if (product.includes('vmware')) virtPlatform = 'VMware';
            else if (product.includes('virtualbox')) virtPlatform = 'VirtualBox';
            else if (product.includes('kvm')) virtPlatform = 'KVM';
          } catch {}
        }

        return {
          isVirtual: !!virtPlatform && virtPlatform !== 'none',
          virtualPlatform: virtPlatform || undefined
        };
      } else if (this.osType === 'win32') {
        // Windows virtualization detection using your clean pattern
        let virtPlatform: string | null = null;
        let systemInfo: any = null;
        
        try {
          const systemData = execSync(
            'powershell -Command "Get-CimInstance Win32_ComputerSystem | Select Model, Manufacturer | ConvertTo-Json"',
            { encoding: 'utf-8' }
          );
          systemInfo = JSON.parse(systemData);
        } catch {}

        if (systemInfo) {
          const model = (systemInfo.Model || '').toLowerCase();
          const manufacturer = (systemInfo.Manufacturer || '').toLowerCase();

          // Check multiple indicators for virtualization
          if (model.includes('vmware') || manufacturer.includes('vmware')) {
            virtPlatform = 'VMware';
          } else if (model.includes('virtualbox') || manufacturer.includes('innotek')) {
            virtPlatform = 'VirtualBox';
          } else if (model.includes('virtual') || manufacturer.includes('microsoft corporation')) {
            // Check for Hyper-V specifically
            let hyperVModel: string | null = null;
            try {
              hyperVModel = execSync(
                'powershell -Command "Get-CimInstance Win32_ComputerSystem | Select -ExpandProperty Model"',
                { encoding: 'utf-8' }
              ).toLowerCase();
            } catch {}
            
            virtPlatform = (hyperVModel && hyperVModel.includes('virtual')) ? 'Hyper-V' : 'Virtual Machine';
          } else if (manufacturer.includes('qemu')) {
            virtPlatform = 'QEMU';
          }
        }

        return {
          isVirtual: !!virtPlatform,
          virtualPlatform: virtPlatform || undefined
        };
      }
      
      return { isVirtual: false };
    } catch (error) {
      return { isVirtual: false };
    }
  }

  /**
   * Get network card information
   */
  private async getNetworkInfo(): Promise<StaticHardwareData['network']> {
    try {
      if (this.osType === 'win32') {
        // Windows network adapter detection using your clean pattern
        let adapterInfo = null;
        try {
          adapterInfo = execSync(
            'powershell -Command "Get-NetAdapter | Where {$_.Status -eq \'Up\' -and $_.Virtual -eq $false} | Select Name, LinkSpeed, InterfaceDescription, MediaType | Sort LinkSpeed -Descending | Select -First 1 | ConvertTo-Json"',
            { encoding: 'utf-8' }
          ).trim();
        } catch {}

        if (adapterInfo) {
          try {
            const adapter = JSON.parse(adapterInfo);
            return {
              nicModel: adapter.InterfaceDescription || adapter.Name || 'Unknown Network Adapter',
              speedMbps: adapter.LinkSpeed ? Math.round(adapter.LinkSpeed / 1000000) : undefined,
              mediaType: adapter.MediaType || undefined
            };
          } catch {}
        }

        // Fallback using your clean pattern
        let adapterName = null;
        try {
          adapterName = execSync(
            'powershell -Command "Get-NetAdapter | Where {$_.Status -eq \'Up\'} | Select -First 1 -ExpandProperty Name"',
            { encoding: 'utf-8' }
          ).trim();
        } catch {}

        return {
          nicModel: adapterName || 'Unknown Network Adapter'
        };
      } else if (this.osType === 'linux') {
        const interfaces = networkInterfaces();
        const activeInterface = Object.keys(interfaces).find(name => 
          interfaces[name]?.some(iface => iface.family === 'IPv4' && !iface.internal)
        );
        
        if (activeInterface) {
          try {
            const { stdout } = await execAsync(`ethtool ${activeInterface} 2>/dev/null | grep Speed`);
            const speedMatch = stdout.match(/Speed:\s+(\d+)/);
            return {
              nicModel: activeInterface,
              speedMbps: speedMatch ? parseInt(speedMatch[1]) : undefined
            };
          } catch {
            return { nicModel: activeInterface };
          }
        }
      } else if (this.osType === 'darwin') {
        const { stdout } = await execAsync('networksetup -listallhardwareports');
        const lines = stdout.split('\n');
        const portLine = lines.find(line => line.includes('Ethernet') || line.includes('Wi-Fi'));
        
        return {
          nicModel: portLine ? portLine.replace('Hardware Port: ', '').trim() : 'Unknown'
        };
      }
      
      return {};
    } catch (error) {
      console.warn('[Hardware Detection] Network adapter detection failed - command unavailable or permissions:', error instanceof Error ? error.message : String(error));
      return {};
    }
  }

  /**
   * Get system information
   */
  private async getSystemInfo(): Promise<StaticHardwareData['system']> {
    try {
      const swapInfo = await this.getSwapInfo();
      
      return {
        arch: arch(),
        hostname: hostname(),
        swapTotalMB: swapInfo,
        bootUptimeSeconds: uptime() // Direct usage - your clean pattern
      };
    } catch (error) {
      console.warn('[Hardware Detection] System info detection failed - partial data available:', error instanceof Error ? error.message : String(error));
      return {
        arch: arch(),
        hostname: hostname()
      };
    }
  }

  private async getSwapInfo(): Promise<number | undefined> {
    try {
      if (this.osType === 'linux') {
        const { stdout } = await execAsync('free -m | grep Swap');
        const swapMatch = stdout.match(/Swap:\s+(\d+)/);
        return swapMatch ? parseInt(swapMatch[1]) : undefined;
      } else if (this.osType === 'darwin') {
        const { stdout } = await execAsync('sysctl -n vm.swapusage');
        const totalMatch = stdout.match(/total = ([\d.]+)M/);
        return totalMatch ? parseFloat(totalMatch[1]) : undefined;
      } else if (this.osType === 'win32') {
        try {
          // Improved Windows swap/page file detection
          const pageFileInfo = execSync(
            'powershell -Command "Get-CimInstance Win32_PageFileUsage | Select-Object AllocatedBaseSize, CurrentUsage | ConvertTo-Json"',
            { encoding: 'utf-8', timeout: 8000 }
          ).trim();

          if (!pageFileInfo) return undefined;

          const pageData = JSON.parse(pageFileInfo);
          const data = Array.isArray(pageData) ? pageData[0] : pageData;
          
          return data.AllocatedBaseSize ? parseInt(data.AllocatedBaseSize) : undefined;
        } catch (error) {
          console.warn('[Hardware Detection] Windows swap detection failed - permissions or configuration issue:', error instanceof Error ? error.message : String(error));
          
                      // Fallback to basic detection
            try {
              const allocatedSize = parseInt(execSync(
                'powershell -Command "Get-CimInstance Win32_PageFileUsage | Select-Object -First 1 -ExpandProperty AllocatedBaseSize"',
                { encoding: 'utf-8', timeout: 5000 }
              ));
              
              return allocatedSize > 0 ? allocatedSize : undefined;
            } catch {
              return undefined;
            }
        }
      }
    } catch (error) {
      return undefined;
    }
  }

  private async getBootUptime(): Promise<number | undefined> {
    try {
      // Wrapper method with validation - you can use os.uptime() directly
      // bootUptimeSeconds: uptime()
      const bootUptimeSeconds = Math.round(uptime());
      
      // Validate uptime is reasonable (not negative, not more than 1 year)
      if (bootUptimeSeconds > 0 && bootUptimeSeconds < (365 * 24 * 3600)) {
        return bootUptimeSeconds;
      }
      
      return undefined;
    } catch (error) {
      console.warn('[Hardware Detection] Boot uptime detection failed - system timing unavailable:', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  /**
   * Generate a hash of the static data for change detection
   */
  public generateDataHash(data: StaticHardwareData): string {
    // Exclude dynamic fields that shouldn't trigger cache updates
    const staticFields = {
      cpu: data.cpu,
      ram: data.ram,
      storage: data.storage,
      gpu: data.gpu,
      os: data.os,
      network: data.network,
      system: {
        arch: data.system.arch,
        hostname: data.system.hostname
      }
    };
    
    const dataString = JSON.stringify(staticFields, Object.keys(staticFields).sort());
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
} 

/**
 * Default export function that collects and returns complete hardware data
 * This provides the clean interface requested for cross-platform hardware detection
 */
export default async function collectHardwareData(): Promise<StaticHardwareData> {
  const detector = HardwareDetection.getInstance();
  const data = await detector.collectStaticData();
  
  return {
    wanIp: data.wanIp,
    lanIp: data.lanIp,
    cpu: data.cpu,
    ram: data.ram,
    storage: data.storage,
    gpu: data.gpu,
    os: data.os,
    network: data.network,
    system: data.system
  };
} 