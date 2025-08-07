import { namespaceWrapper, app } from "@_koii/task-manager/namespace-wrapper";
import { UptimeTracker } from './uptime-tracker';
import { UptimeUtils } from './uptime-utils';
import { StaticCacheManager } from './static-cache-manager';
import { distributionMonitor } from './distribution-monitor';

/**
 * 
 * Define all your custom routes here
 * 
 */

//Example route 
export async function routes() {
  const uptimeTracker = UptimeTracker.getInstance();
  const uptimeUtils = UptimeUtils.getInstance();
  const staticCacheManager = StaticCacheManager.getInstance();

  app.get("/value", async (_req, res) => {
    const value = await namespaceWrapper.storeGet("value");
    console.log("value", value);
    res.status(200).json({ value: value });
  });

  // Uptime API endpoints
  app.get("/uptime/current", async (_req, res) => {
    try {
      const currentUptime = uptimeTracker.getCurrentUptimeSeconds();
      const summary = await uptimeUtils.getUptimeSummary();
      res.status(200).json({ 
        uptimeSeconds: currentUptime,
        summary: summary,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching current uptime:', error);
      res.status(500).json({ error: 'Failed to fetch current uptime' });
    }
  });

  app.get("/uptime/records", async (_req, res) => {
    try {
      const records = await uptimeTracker.getUptimeRecords();
      res.status(200).json({ 
        records: records,
        totalRecords: records.length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching uptime records:', error);
      res.status(500).json({ error: 'Failed to fetch uptime records' });
    }
  });

  app.get("/uptime/stats", async (_req, res) => {
    try {
      const stats = await uptimeTracker.calculateUptimeStats();
      res.status(200).json({ 
        stats: stats,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching uptime stats:', error);
      res.status(500).json({ error: 'Failed to fetch uptime statistics' });
    }
  });

  app.get("/uptime/report", async (req, res) => {
    try {
      const nodeId = (req.query.nodeId as string) || 'unknown';
      const report = await uptimeUtils.generateUptimeReport(nodeId);
      res.status(200).json({ 
        report: report,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error generating uptime report:', error);
      res.status(500).json({ error: 'Failed to generate uptime report' });
    }
  });

  app.get("/uptime/eligibility", async (_req, res) => {
    try {
      const isEligible = await uptimeUtils.checkMonthlyEligibility();
      const stats = await uptimeTracker.calculateUptimeStats();
      const currentMonth = new Date().getFullYear() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');
      const monthlyPercentage = stats.monthly[currentMonth]?.percentage || 0;
      
      res.status(200).json({ 
        isEligible: isEligible,
        monthlyUptime: monthlyPercentage,
        requiredUptime: 95,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error checking uptime eligibility:', error);
      res.status(500).json({ error: 'Failed to check uptime eligibility' });
    }
  });

  app.get("/uptime/export", async (_req, res) => {
    try {
      const exportData = await uptimeUtils.exportUptimeDataForWebDB();
      res.status(200).json({ 
        exportData: JSON.parse(exportData),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error exporting uptime data:', error);
      res.status(500).json({ error: 'Failed to export uptime data' });
    }
  });

  app.get("/uptime/range", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate query parameters are required' });
        return;
      }
      
      const rangeData = await uptimeUtils.getUptimeForDateRange(startDate, endDate);
      res.status(200).json({ 
        dateRange: { startDate, endDate },
        uptime: rangeData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching uptime for date range:', error);
      res.status(500).json({ error: 'Failed to fetch uptime for date range' });
    }
  });

  app.get("/uptime/leaderboard", async (_req, res) => {
    try {
      const leaderboardData = await uptimeUtils.getLeaderboardData();
      res.status(200).json({ 
        leaderboard: leaderboardData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }
  });

  // Administrative endpoints
  app.post("/uptime/reset", async (_req, res) => {
    try {
      await uptimeUtils.resetUptimeTracking();
      res.status(200).json({ 
        message: 'Uptime tracking reset successfully',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error resetting uptime tracking:', error);
      res.status(500).json({ error: 'Failed to reset uptime tracking' });
    }
  });

  // Health check endpoint
  app.get("/health", async (_req, res) => {
    try {
      const summary = await uptimeUtils.getUptimeSummary();
      const isEligible = await uptimeUtils.checkMonthlyEligibility();
      
      res.status(200).json({ 
        status: 'healthy',
        uptimeSummary: summary,
        isEligible: isEligible,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: Date.now()
      });
    }
  });

  // Static data export endpoint
  app.get("/static/export", async (_req, res) => {
    try {
      const exportData = await staticCacheManager.exportStaticDataForWebDB();
      res.status(200).json({ 
        exportData: JSON.parse(exportData),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error exporting static data:', error);
      res.status(500).json({ error: 'Failed to export static data' });
    }
  });

  // Complete data export for web database
  app.get("/data/export", async (_req, res) => {
    try {
      const uptimeExport = await uptimeUtils.exportUptimeDataForWebDB();
      const staticExport = await staticCacheManager.exportStaticDataForWebDB();
      
      const completeExport = {
        nodeId: process.env.NODE_ID || 'unknown',
        exportTimestamp: Date.now(),
        exportDate: new Date().toISOString(),
        uptimeData: JSON.parse(uptimeExport),
        staticData: JSON.parse(staticExport),
        summary: {
          totalUptimeRecords: JSON.parse(uptimeExport).totalRecords,
          hasStaticData: true,
          isEligibleForRewards: await uptimeUtils.checkMonthlyEligibility()
        }
      };
      
      res.status(200).json({ 
        exportData: completeExport,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error exporting complete data:', error);
      res.status(500).json({ error: 'Failed to export complete data' });
    }
  });

  // Node score calculation endpoint
  app.get("/score/calculate", async (_req, res) => {
    try {
      const stats = await uptimeTracker.calculateUptimeStats();
      const records = await uptimeTracker.getUptimeRecords();
      
      // Calculate cumulative node score
      const monthlyPercentages = Object.values(stats.monthly).map(m => m.percentage);
      const averageMonthlyUptime = monthlyPercentages.length > 0 
        ? monthlyPercentages.reduce((sum, p) => sum + p, 0) / monthlyPercentages.length 
        : 0;
      
      const totalUptimeHours = records.length; // Each record = 1 hour
      const consecutiveHours = uptimeUtils['calculateConsecutiveHours'](records);
      const longestUptime = uptimeUtils['calculateLongestUptime'](records);
      
      const nodeScore = {
        averageMonthlyUptime: Math.round(averageMonthlyUptime * 100) / 100,
        totalUptimeHours,
        consecutiveHours,
        longestUptime,
        totalRecords: records.length,
        isEligibleFor95Percent: averageMonthlyUptime >= 95,
        score: Math.round(averageMonthlyUptime * 10) / 10 // Score out of 100
      };
      
      res.status(200).json({ 
        nodeScore,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error calculating node score:', error);
      res.status(500).json({ error: 'Failed to calculate node score' });
    }
  });

  // Web database upload endpoint
  app.post("/upload/webdb", async (req, res) => {
    try {
      const { webDBUrl, apiKey } = req.body;
      
      if (!webDBUrl) {
        res.status(400).json({ error: 'webDBUrl is required' });
        return;
      }
      
      const success = await uptimeUtils.uploadDataToWebDB(webDBUrl, apiKey);
      
      if (success) {
        res.status(200).json({ 
          message: 'Data uploaded successfully to web database',
          timestamp: Date.now()
        });
      } else {
        res.status(500).json({ error: 'Failed to upload data to web database' });
      }
    } catch (error) {
      console.error('Error uploading to web database:', error);
      res.status(500).json({ error: 'Failed to upload to web database' });
    }
  });

  // Distribution monitoring endpoints
  app.get("/distribution/health", async (_req, res) => {
    try {
      const health = distributionMonitor.getHealth();
      res.status(200).json({
        status: health.isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        data: health
      });
    } catch (error) {
      console.error('Error fetching distribution health:', error);
      res.status(500).json({ error: 'Failed to fetch distribution health' });
    }
  });

  app.get("/distribution/report", async (_req, res) => {
    try {
      const report = distributionMonitor.generateHealthReport();
      res.set('Content-Type', 'text/plain');
      res.status(200).send(report);
    } catch (error) {
      console.error('Error generating distribution report:', error);
      res.status(500).json({ error: 'Failed to generate distribution report' });
    }
  });

  app.get("/distribution/alerts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const alerts = distributionMonitor.getRecentAlerts(limit);
      res.status(200).json({
        timestamp: new Date().toISOString(),
        alerts: alerts
      });
    } catch (error) {
      console.error('Error fetching distribution alerts:', error);
      res.status(500).json({ error: 'Failed to fetch distribution alerts' });
    }
  });

  app.post("/distribution/trigger/:round", async (req, res) => {
    try {
      const round = parseInt(req.params.round);
      if (isNaN(round) || round < 0) {
        return res.status(400).json({ error: 'Invalid round number' });
      }
      
      // Import the distribution function
      const { generateAndSubmitDistributionList } = await import('./4-distribution');
      
      const result = await generateAndSubmitDistributionList({ round });
      res.status(200).json({
        success: true,
        round: round,
        result: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Manual distribution trigger failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/distribution/status", async (_req, res) => {
    try {
      const health = distributionMonitor.getHealth();
      const alerts = distributionMonitor.getRecentAlerts(5);
      
      res.status(200).json({
        timestamp: new Date().toISOString(),
        health: health,
        recentAlerts: alerts,
        summary: {
          isHealthy: health.isHealthy,
          lastSuccessfulRound: health.lastSuccessfulRound,
          successRate: `${(health.successRate * 100).toFixed(1)}%`,
          totalRounds: health.totalRoundsProcessed,
          failedRounds: health.failedRounds.length
        }
      });
    } catch (error) {
      console.error('Error fetching distribution status:', error);
      res.status(500).json({ error: 'Failed to fetch distribution status' });
    }
  });
}
