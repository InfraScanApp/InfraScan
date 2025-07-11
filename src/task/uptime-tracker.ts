import { namespaceWrapper } from "@_koii/task-manager/namespace-wrapper";

export interface UptimeRecord {
  timestamp: number;
  date: string;
  roundNumber: number;
  uptimeSeconds: number;
  uptimeMinutes: number;
  uptimeHours: number;
  uptimeDays: number;
  nodeStartTime: number;
  isOnline: boolean;
}

export interface UptimeStats {
  daily: { [date: string]: { uptime: number; totalRounds: number; percentage: number } };
  weekly: { [weekKey: string]: { uptime: number; totalRounds: number; percentage: number } };
  monthly: { [monthKey: string]: { uptime: number; totalRounds: number; percentage: number } };
}

export class UptimeTracker {
  private static instance: UptimeTracker;
  private nodeStartTime: number;
  private readonly UPTIME_RECORDS_KEY = 'uptime_records';
  private readonly NODE_START_TIME_KEY = 'node_start_time';
  private readonly ROUND_DURATION_MS = 3600000; // 1 hour in milliseconds

  private constructor() {
    this.nodeStartTime = Date.now();
  }

  public static getInstance(): UptimeTracker {
    if (!UptimeTracker.instance) {
      UptimeTracker.instance = new UptimeTracker();
    }
    return UptimeTracker.instance;
  }

  /**
   * Initialize the uptime tracker
   */
  public async initialize(): Promise<void> {
    try {
      // Try to retrieve existing node start time
      const existingStartTime = await namespaceWrapper.storeGet(this.NODE_START_TIME_KEY);
      
      if (existingStartTime) {
        this.nodeStartTime = parseInt(existingStartTime);
        console.log('Uptime Tracker: Resumed tracking from existing start time:', new Date(this.nodeStartTime));
      } else {
        // First time initialization
        await namespaceWrapper.storeSet(this.NODE_START_TIME_KEY, this.nodeStartTime.toString());
        console.log('Uptime Tracker: Initialized with new start time:', new Date(this.nodeStartTime));
      }
    } catch (error) {
      console.error('Uptime Tracker: Failed to initialize:', error);
    }
  }

  /**
   * Record uptime for the current round
   */
  public async recordUptime(roundNumber: number): Promise<UptimeRecord> {
    const now = Date.now();
    const uptimeMs = now - this.nodeStartTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);

    const record: UptimeRecord = {
      timestamp: now,
      date: new Date(now).toISOString().split('T')[0], // YYYY-MM-DD format
      roundNumber,
      uptimeSeconds,
      uptimeMinutes,
      uptimeHours,
      uptimeDays,
      nodeStartTime: this.nodeStartTime,
      isOnline: true
    };

    try {
      // Store the record
      await this.storeUptimeRecord(record);
      console.log(`Uptime Tracker: Recorded uptime for round ${roundNumber}: ${this.formatUptime(uptimeSeconds)}`);
      return record;
    } catch (error) {
      console.error('Uptime Tracker: Failed to record uptime:', error);
      throw error;
    }
  }

  /**
   * Store uptime record in the database
   */
  private async storeUptimeRecord(record: UptimeRecord): Promise<void> {
    try {
      const existingRecords = await this.getUptimeRecords();
      existingRecords.push(record);
      
      // Keep only last 30 days of records to prevent excessive storage
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredRecords = existingRecords.filter(r => r.timestamp > thirtyDaysAgo);
      
      await namespaceWrapper.storeSet(this.UPTIME_RECORDS_KEY, JSON.stringify(filteredRecords));
    } catch (error) {
      console.error('Uptime Tracker: Failed to store uptime record:', error);
      throw error;
    }
  }

  /**
   * Get all uptime records
   */
  public async getUptimeRecords(): Promise<UptimeRecord[]> {
    try {
      const recordsStr = await namespaceWrapper.storeGet(this.UPTIME_RECORDS_KEY);
      return recordsStr ? JSON.parse(recordsStr) : [];
    } catch (error) {
      console.error('Uptime Tracker: Failed to get uptime records:', error);
      return [];
    }
  }

  /**
   * Calculate uptime statistics (daily, weekly, monthly)
   */
  public async calculateUptimeStats(): Promise<UptimeStats> {
    const records = await this.getUptimeRecords();
    const stats: UptimeStats = {
      daily: {},
      weekly: {},
      monthly: {}
    };

    records.forEach(record => {
      const date = new Date(record.timestamp);
      const dateStr = record.date;
      const weekKey = this.getWeekKey(date);
      const monthKey = this.getMonthKey(date);

      // Daily stats
      if (!stats.daily[dateStr]) {
        stats.daily[dateStr] = { uptime: 0, totalRounds: 0, percentage: 0 };
      }
      stats.daily[dateStr].uptime += this.ROUND_DURATION_MS;
      stats.daily[dateStr].totalRounds++;

      // Weekly stats
      if (!stats.weekly[weekKey]) {
        stats.weekly[weekKey] = { uptime: 0, totalRounds: 0, percentage: 0 };
      }
      stats.weekly[weekKey].uptime += this.ROUND_DURATION_MS;
      stats.weekly[weekKey].totalRounds++;

      // Monthly stats
      if (!stats.monthly[monthKey]) {
        stats.monthly[monthKey] = { uptime: 0, totalRounds: 0, percentage: 0 };
      }
      stats.monthly[monthKey].uptime += this.ROUND_DURATION_MS;
      stats.monthly[monthKey].totalRounds++;
    });

    // Calculate percentages
    Object.keys(stats.daily).forEach(key => {
      const expectedRounds = 24; // 24 hours per day
      stats.daily[key].percentage = (stats.daily[key].totalRounds / expectedRounds) * 100;
    });

    Object.keys(stats.weekly).forEach(key => {
      const expectedRounds = 168; // 24 * 7 hours per week
      stats.weekly[key].percentage = (stats.weekly[key].totalRounds / expectedRounds) * 100;
    });

    Object.keys(stats.monthly).forEach(key => {
      const expectedRounds = this.getExpectedRoundsForMonth(key);
      stats.monthly[key].percentage = (stats.monthly[key].totalRounds / expectedRounds) * 100;
    });

    return stats;
  }

  /**
   * Get current uptime in seconds
   */
  public getCurrentUptimeSeconds(): number {
    return Math.floor((Date.now() - this.nodeStartTime) / 1000);
  }

  /**
   * Reset node start time (for testing or after maintenance)
   */
  public async resetNodeStartTime(): Promise<void> {
    this.nodeStartTime = Date.now();
    await namespaceWrapper.storeSet(this.NODE_START_TIME_KEY, this.nodeStartTime.toString());
    console.log('Uptime Tracker: Reset node start time to:', new Date(this.nodeStartTime));
  }

  /**
   * Get uptime data for submission (max 512 bytes)
   */
  public async getUptimeSubmissionData(): Promise<string> {
    const currentUptime = this.getCurrentUptimeSeconds();
    const stats = await this.calculateUptimeStats();
    
    // Get current month's uptime percentage
    const currentMonthKey = this.getMonthKey(new Date());
    const monthlyPercentage = stats.monthly[currentMonthKey]?.percentage || 0;
    
    // Create compact submission data
    const submissionData = {
      uptime: currentUptime,
      monthlyUptime: Math.round(monthlyPercentage * 100) / 100, // 2 decimal places
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };

    return JSON.stringify(submissionData);
  }

  /**
   * Format uptime duration for display
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  /**
   * Get week key for grouping (ISO week format)
   */
  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get month key for grouping (YYYY-MM format)
   */
  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get expected rounds for a given month
   */
  private getExpectedRoundsForMonth(monthKey: string): number {
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return daysInMonth * 24; // 24 hours per day
  }
} 