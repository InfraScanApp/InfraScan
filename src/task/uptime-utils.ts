import { UptimeTracker, UptimeRecord, UptimeStats } from './uptime-tracker';

export interface UptimeReport {
  nodeId: string;
  reportDate: string;
  currentUptime: number;
  dailyUptimes: { [date: string]: number };
  weeklyUptimes: { [week: string]: number };
  monthlyUptimes: { [month: string]: number };
  averageMonthlyUptime: number;
  isEligibleFor95Percent: boolean;
  totalRecords: number;
}

export interface LeaderboardEntry {
  nodeId: string;
  monthlyUptime: number;
  totalUptime: number;
  rank: number;
  isEligible: boolean;
}

export class UptimeUtils {
  private static instance: UptimeUtils;
  private uptimeTracker: UptimeTracker;

  private constructor() {
    this.uptimeTracker = UptimeTracker.getInstance();
  }

  public static getInstance(): UptimeUtils {
    if (!UptimeUtils.instance) {
      UptimeUtils.instance = new UptimeUtils();
    }
    return UptimeUtils.instance;
  }

  /**
   * Generate a comprehensive uptime report
   */
  public async generateUptimeReport(nodeId: string = 'unknown'): Promise<UptimeReport> {
    try {
      const stats = await this.uptimeTracker.calculateUptimeStats();
      const records = await this.uptimeTracker.getUptimeRecords();
      const currentUptime = this.uptimeTracker.getCurrentUptimeSeconds();

      // Calculate average monthly uptime
      const monthlyPercentages = Object.values(stats.monthly).map(m => m.percentage);
      const averageMonthlyUptime = monthlyPercentages.length > 0 
        ? monthlyPercentages.reduce((sum, p) => sum + p, 0) / monthlyPercentages.length 
        : 0;

      // Check if eligible for 95% uptime requirement
      const isEligibleFor95Percent = this.checkEligibilityFor95Percent(stats);

      const report: UptimeReport = {
        nodeId,
        reportDate: new Date().toISOString(),
        currentUptime,
        dailyUptimes: this.extractPercentages(stats.daily),
        weeklyUptimes: this.extractPercentages(stats.weekly),
        monthlyUptimes: this.extractPercentages(stats.monthly),
        averageMonthlyUptime: Math.round(averageMonthlyUptime * 100) / 100,
        isEligibleFor95Percent,
        totalRecords: records.length
      };

      return report;
    } catch (error) {
      console.error('UptimeUtils: Failed to generate uptime report:', error);
      throw error;
    }
  }

  /**
   * Export uptime data for web database upload
   */
  public async exportUptimeDataForWebDB(): Promise<string> {
    try {
      const records = await this.uptimeTracker.getUptimeRecords();
      const stats = await this.uptimeTracker.calculateUptimeStats();
      
      const exportData = {
        nodeId: process.env.NODE_ID || 'unknown',
        exportTimestamp: Date.now(),
        exportDate: new Date().toISOString(),
        totalRecords: records.length,
        currentUptime: this.uptimeTracker.getCurrentUptimeSeconds(),
        records: records.map(record => ({
          timestamp: record.timestamp,
          date: record.date,
          roundNumber: record.roundNumber,
          uptimeSeconds: record.uptimeSeconds,
          isOnline: record.isOnline
        })),
        stats: {
          daily: stats.daily,
          weekly: stats.weekly,
          monthly: stats.monthly
        },
        summary: {
          averageMonthlyUptime: this.calculateAverageMonthlyUptime(stats),
          isEligibleFor95Percent: this.checkEligibilityFor95Percent(stats),
          consecutiveHours: this.calculateConsecutiveHours(records),
          longestUptime: this.calculateLongestUptime(records)
        }
      };

      return JSON.stringify(exportData);
    } catch (error) {
      console.error('UptimeUtils: Failed to export uptime data:', error);
      throw error;
    }
  }

  /**
   * Check if node meets 95% uptime requirement for the current month
   */
  public async checkMonthlyEligibility(): Promise<boolean> {
    try {
      const stats = await this.uptimeTracker.calculateUptimeStats();
      const currentMonth = new Date().getFullYear() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');
      const monthlyUptime = stats.monthly[currentMonth]?.percentage || 0;
      
      return monthlyUptime >= 95;
    } catch (error) {
      console.error('UptimeUtils: Failed to check monthly eligibility:', error);
      return false;
    }
  }

  /**
   * Get uptime summary for display
   */
  public async getUptimeSummary(): Promise<string> {
    try {
      const currentUptime = this.uptimeTracker.getCurrentUptimeSeconds();
      const stats = await this.uptimeTracker.calculateUptimeStats();
      const isEligible = await this.checkMonthlyEligibility();
      
      const days = Math.floor(currentUptime / 86400);
      const hours = Math.floor((currentUptime % 86400) / 3600);
      const minutes = Math.floor((currentUptime % 3600) / 60);
      
      const currentMonth = new Date().getFullYear() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');
      const monthlyPercentage = stats.monthly[currentMonth]?.percentage || 0;
      
      return `Node Uptime: ${days}d ${hours}h ${minutes}m | Monthly: ${monthlyPercentage.toFixed(2)}% | Eligible: ${isEligible ? 'Yes' : 'No'}`;
    } catch (error) {
      console.error('UptimeUtils: Failed to get uptime summary:', error);
      return 'Uptime data unavailable';
    }
  }

  /**
   * Calculate uptime statistics for a specific date range
   */
  public async getUptimeForDateRange(startDate: string, endDate: string): Promise<{ percentage: number; totalHours: number; onlineHours: number }> {
    try {
      const records = await this.uptimeTracker.getUptimeRecords();
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      
      const filteredRecords = records.filter(record => 
        record.timestamp >= start && record.timestamp <= end
      );
      
      const totalHours = Math.ceil((end - start) / 3600000); // Convert to hours
      const onlineHours = filteredRecords.length;
      const percentage = totalHours > 0 ? (onlineHours / totalHours) * 100 : 0;
      
      return {
        percentage: Math.round(percentage * 100) / 100,
        totalHours,
        onlineHours
      };
    } catch (error) {
      console.error('UptimeUtils: Failed to calculate uptime for date range:', error);
      return { percentage: 0, totalHours: 0, onlineHours: 0 };
    }
  }

  /**
   * Reset uptime tracking (for maintenance or testing)
   */
  public async resetUptimeTracking(): Promise<void> {
    try {
      await this.uptimeTracker.resetNodeStartTime();
      console.log('UptimeUtils: Uptime tracking reset successfully');
    } catch (error) {
      console.error('UptimeUtils: Failed to reset uptime tracking:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard data (for future web implementation)
   */
  public async getLeaderboardData(): Promise<LeaderboardEntry[]> {
    try {
      // This would typically fetch data from multiple nodes
      // For now, return current node's data
      const stats = await this.uptimeTracker.calculateUptimeStats();
      const currentMonth = new Date().getFullYear() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');
      const monthlyUptime = stats.monthly[currentMonth]?.percentage || 0;
      const totalUptime = this.uptimeTracker.getCurrentUptimeSeconds();
      
      return [{
        nodeId: process.env.NODE_ID || 'current-node',
        monthlyUptime: Math.round(monthlyUptime * 100) / 100,
        totalUptime,
        rank: 1,
        isEligible: monthlyUptime >= 95
      }];
    } catch (error) {
      console.error('UptimeUtils: Failed to get leaderboard data:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private extractPercentages(stats: { [key: string]: { percentage: number } }): { [key: string]: number } {
    const result: { [key: string]: number } = {};
    Object.keys(stats).forEach(key => {
      result[key] = Math.round(stats[key].percentage * 100) / 100;
    });
    return result;
  }

  private checkEligibilityFor95Percent(stats: UptimeStats): boolean {
    const monthlyPercentages = Object.values(stats.monthly).map(m => m.percentage);
    return monthlyPercentages.length > 0 && monthlyPercentages.every(p => p >= 95);
  }

  private calculateAverageMonthlyUptime(stats: UptimeStats): number {
    const monthlyPercentages = Object.values(stats.monthly).map(m => m.percentage);
    if (monthlyPercentages.length === 0) return 0;
    
    const average = monthlyPercentages.reduce((sum, p) => sum + p, 0) / monthlyPercentages.length;
    return Math.round(average * 100) / 100;
  }

  private calculateConsecutiveHours(records: UptimeRecord[]): number {
    if (records.length === 0) return 0;
    
    // Sort records by timestamp
    const sortedRecords = records.sort((a, b) => a.timestamp - b.timestamp);
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (let i = 0; i < sortedRecords.length; i++) {
      if (sortedRecords[i].isOnline) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }

  private calculateLongestUptime(records: UptimeRecord[]): number {
    if (records.length === 0) return 0;
    
    return Math.max(...records.map(r => r.uptimeSeconds));
  }
} 