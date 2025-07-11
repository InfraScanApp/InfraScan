import { namespaceWrapper, app } from "@_koii/task-manager/namespace-wrapper";
import { UptimeTracker } from './uptime-tracker';
import { UptimeUtils } from './uptime-utils';

/**
 * 
 * Define all your custom routes here
 * 
 */

//Example route 
export async function routes() {
  const uptimeTracker = UptimeTracker.getInstance();
  const uptimeUtils = UptimeUtils.getInstance();

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
}
