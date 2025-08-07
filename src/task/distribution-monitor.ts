/**
 * Distribution Monitoring System
 * 
 * Monitors reward distribution health and provides alerts for issues
 */

export interface DistributionHealth {
  lastSuccessfulRound: number;
  lastSuccessfulTimestamp: number;
  failedRounds: number[];
  totalRoundsProcessed: number;
  successRate: number;
  isHealthy: boolean;
  alerts: string[];
}

export interface DistributionAlert {
  type: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  round?: number;
  timestamp: number;
  details?: any;
}

export class DistributionMonitor {
  private static instance: DistributionMonitor;
  private healthData: DistributionHealth;
  private alerts: DistributionAlert[] = [];
  private readonly MAX_ALERTS = 100;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private healthCheckTimer?: NodeJS.Timeout;

  private constructor() {
    this.healthData = {
      lastSuccessfulRound: -1,
      lastSuccessfulTimestamp: 0,
      failedRounds: [],
      totalRoundsProcessed: 0,
      successRate: 0,
      isHealthy: true,
      alerts: []
    };
  }

  public static getInstance(): DistributionMonitor {
    if (!DistributionMonitor.instance) {
      DistributionMonitor.instance = new DistributionMonitor();
    }
    return DistributionMonitor.instance;
  }

  /**
   * Record a successful distribution
   */
  public recordSuccessfulDistribution(round: number): void {
    this.healthData.lastSuccessfulRound = round;
    this.healthData.lastSuccessfulTimestamp = Date.now();
    this.healthData.totalRoundsProcessed++;
    this.updateSuccessRate();
    
    console.log(`✅ DISTRIBUTION MONITOR: Round ${round} recorded as successful`);
    
    // Remove from failed rounds if it was there
    this.healthData.failedRounds = this.healthData.failedRounds.filter(r => r !== round);
    
    this.addAlert('INFO', `Distribution successful for round ${round}`);
  }

  /**
   * Record a failed distribution
   */
  public recordFailedDistribution(round: number, error?: string): void {
    if (!this.healthData.failedRounds.includes(round)) {
      this.healthData.failedRounds.push(round);
    }
    this.healthData.totalRoundsProcessed++;
    this.updateSuccessRate();
    
    console.error(`❌ DISTRIBUTION MONITOR: Round ${round} recorded as failed`);
    
    this.addAlert('ERROR', `Distribution failed for round ${round}`, round, { error });
  }

  /**
   * Check if distribution is healthy
   */
  public checkHealth(): DistributionHealth {
    const now = Date.now();
    const timeSinceLastSuccess = now - this.healthData.lastSuccessfulTimestamp;
    
    // Check for recent failures
    const recentFailures = this.healthData.failedRounds.filter(round => {
      // Consider rounds from last 2 hours as recent
      return round > this.healthData.lastSuccessfulRound - 2;
    });
    
    // Determine health status
    this.healthData.isHealthy = 
      this.healthData.successRate >= 0.8 && // 80% success rate
      recentFailures.length <= 2 && // No more than 2 recent failures
      timeSinceLastSuccess < 2 * 60 * 60 * 1000; // Success within last 2 hours
    
    // Generate alerts for health issues
    if (!this.healthData.isHealthy) {
      if (this.healthData.successRate < 0.8) {
        this.addAlert('WARNING', `Low success rate: ${(this.healthData.successRate * 100).toFixed(1)}%`);
      }
      if (recentFailures.length > 2) {
        this.addAlert('WARNING', `Too many recent failures: ${recentFailures.length}`);
      }
      if (timeSinceLastSuccess > 2 * 60 * 60 * 1000) {
        this.addAlert('ERROR', `No successful distribution for ${Math.floor(timeSinceLastSuccess / (60 * 60 * 1000))} hours`);
      }
    }
    
    return { ...this.healthData };
  }

  /**
   * Get current health status
   */
  public getHealth(): DistributionHealth {
    return this.checkHealth();
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 10): DistributionAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Start health monitoring
   */
  public startMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      const health = this.checkHealth();
      if (!health.isHealthy) {
        console.warn('⚠️ DISTRIBUTION HEALTH CHECK: Issues detected', health);
      } else {
        console.log('✅ DISTRIBUTION HEALTH CHECK: All systems operational');
      }
    }, this.HEALTH_CHECK_INTERVAL);
    
    console.log('🔍 DISTRIBUTION MONITOR: Health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  public stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    console.log('🛑 DISTRIBUTION MONITOR: Health monitoring stopped');
  }

  /**
   * Generate health report
   */
  public generateHealthReport(): string {
    const health = this.checkHealth();
    const recentAlerts = this.getRecentAlerts(5);
    
    const report = `
📊 DISTRIBUTION HEALTH REPORT
============================
Status: ${health.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}
Last Successful Round: ${health.lastSuccessfulRound}
Last Success: ${new Date(health.lastSuccessfulTimestamp).toLocaleString()}
Total Rounds Processed: ${health.totalRoundsProcessed}
Success Rate: ${(health.successRate * 100).toFixed(1)}%
Failed Rounds: ${health.failedRounds.join(', ') || 'None'}

Recent Alerts:
${recentAlerts.map(alert => 
  `[${new Date(alert.timestamp).toLocaleTimeString()}] ${alert.type}: ${alert.message}`
).join('\n')}
    `.trim();
    
    return report;
  }

  /**
   * Update success rate
   */
  private updateSuccessRate(): void {
    if (this.healthData.totalRoundsProcessed === 0) {
      this.healthData.successRate = 0;
    } else {
      const successfulRounds = this.healthData.totalRoundsProcessed - this.healthData.failedRounds.length;
      this.healthData.successRate = successfulRounds / this.healthData.totalRoundsProcessed;
    }
  }

  /**
   * Add alert
   */
  private addAlert(type: 'ERROR' | 'WARNING' | 'INFO', message: string, round?: number, details?: any): void {
    const alert: DistributionAlert = {
      type,
      message,
      round,
      timestamp: Date.now(),
      details
    };
    
    this.alerts.unshift(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }
    
    // Log alert
    const logMessage = `[${type}] DISTRIBUTION ALERT: ${message}${round ? ` (Round ${round})` : ''}`;
    if (type === 'ERROR') {
      console.error(logMessage);
    } else if (type === 'WARNING') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }
}

// Export singleton instance
export const distributionMonitor = DistributionMonitor.getInstance(); 