/**
 * Distribution System Test Suite
 * 
 * Tests the reward distribution functionality to ensure it works correctly
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { generateAndSubmitDistributionList, distribution } from '../src/task/4-distribution';
import { distributionMonitor } from '../src/task/distribution-monitor';

// Mock the namespace wrapper
jest.mock('@_koii/task-manager/namespace-wrapper', () => ({
  namespaceWrapper: {
    getTaskSubmissionInfo: jest.fn(),
    getTaskState: jest.fn(),
    storeSet: jest.fn(),
    storeGet: jest.fn()
  }
}));

describe('Distribution System Tests', () => {
  let mockTaskData: any;
  let mockStakeData: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock data
    mockTaskData = {
      submissions: {
        0: {
          'node1': { submission_value: '{"uptime":3600}', slot: 1000, round: 0 },
          'node2': { submission_value: '{"uptime":3600}', slot: 1001, round: 0 },
          'node3': { submission_value: '{"uptime":3600}', slot: 1002, round: 0 }
        }
      },
      submissions_audit_trigger: {
        0: {
          'node1': { votes: [{ is_valid: true }] },
          'node2': { votes: [{ is_valid: true }] },
          'node3': { votes: [{ is_valid: false }] }
        }
      }
    };

    mockStakeData = {
      stake_list: {
        'node1': 1000,
        'node2': 1000,
        'node3': 1000
      },
      bounty_amount_per_round: 4000000000000
    };

    // Mock the namespace wrapper methods
    const { namespaceWrapper } = require('@_koii/task-manager/namespace-wrapper');
    namespaceWrapper.getTaskSubmissionInfo.mockResolvedValue(mockTaskData);
    namespaceWrapper.getTaskState.mockResolvedValue(mockStakeData);
    namespaceWrapper.storeSet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Reset the distribution monitor
    distributionMonitor['healthData'] = {
      lastSuccessfulRound: -1,
      lastSuccessfulTimestamp: 0,
      failedRounds: [],
      totalRoundsProcessed: 0,
      successRate: 0,
      isHealthy: true,
      alerts: []
    };
  });

  describe('Distribution Function', () => {
    it('should distribute rewards correctly for approved nodes', async () => {
      const submitters = [
        { publicKey: 'node1', votes: 1, stake: 1000 },
        { publicKey: 'node2', votes: 1, stake: 1000 },
        { publicKey: 'node3', votes: 0, stake: 1000 }
      ];

      const result = await distribution(submitters, 4000000000000, 0);

      expect(result['node1']).toBe(3000000000); // 3 tokens
      expect(result['node2']).toBe(3000000000); // 3 tokens
      expect(result['node3']).toBe(0); // No tokens for rejected node
    });

    it('should handle empty submitters list', async () => {
      const result = await distribution([], 4000000000000, 0);
      expect(result).toEqual({});
    });

    it('should handle all rejected submitters', async () => {
      const submitters = [
        { publicKey: 'node1', votes: 0, stake: 1000 },
        { publicKey: 'node2', votes: 0, stake: 1000 }
      ];

      const result = await distribution(submitters, 4000000000000, 0);

      expect(result['node1']).toBe(0);
      expect(result['node2']).toBe(0);
    });
  });

  describe('Generate and Submit Distribution List', () => {
    it('should generate distribution list successfully', async () => {
      const result = await generateAndSubmitDistributionList({ round: 0 });

      expect(result).not.toBe('{}');
      expect(typeof result).toBe('string');
      
      const parsedResult = JSON.parse(result);
      expect(parsedResult['node1']).toBe(3000000000);
      expect(parsedResult['node2']).toBe(3000000000);
      expect(parsedResult['node3']).toBe(0);
    });

    it('should handle missing submissions', async () => {
      mockTaskData.submissions = {};
      
      const result = await generateAndSubmitDistributionList({ round: 0 });
      expect(result).toBe('{}');
    });

    it('should handle invalid public keys', async () => {
      mockTaskData.submissions[0] = {
        '': { submission_value: '{"uptime":3600}', slot: 1000, round: 0 },
        'node1': { submission_value: '{"uptime":3600}', slot: 1001, round: 0 }
      };

      const result = await generateAndSubmitDistributionList({ round: 0 });
      const parsedResult = JSON.parse(result);
      
      expect(parsedResult['node1']).toBe(3000000000);
      expect(parsedResult['']).toBeUndefined();
    });

    it('should retry on failure', async () => {
      const { namespaceWrapper } = require('@_koii/task-manager/namespace-wrapper');
      
      // First call fails, second succeeds
      namespaceWrapper.getTaskSubmissionInfo
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTaskData);

      const result = await generateAndSubmitDistributionList({ round: 0 });
      
      expect(result).not.toBe('{}');
      expect(namespaceWrapper.getTaskSubmissionInfo).toHaveBeenCalledTimes(2);
    });
  });

  describe('Distribution Monitor', () => {
    it('should record successful distributions', () => {
      distributionMonitor.recordSuccessfulDistribution(5);
      
      const health = distributionMonitor.getHealth();
      expect(health.lastSuccessfulRound).toBe(5);
      expect(health.totalRoundsProcessed).toBe(1);
      expect(health.successRate).toBe(1);
      expect(health.isHealthy).toBe(true);
    });

    it('should record failed distributions', () => {
      distributionMonitor.recordFailedDistribution(6, 'Test error');
      
      const health = distributionMonitor.getHealth();
      expect(health.failedRounds).toContain(6);
      expect(health.totalRoundsProcessed).toBe(1);
      expect(health.successRate).toBe(0);
      expect(health.isHealthy).toBe(false);
    });

    it('should calculate success rate correctly', () => {
      distributionMonitor.recordSuccessfulDistribution(1);
      distributionMonitor.recordSuccessfulDistribution(2);
      distributionMonitor.recordFailedDistribution(3, 'Error');
      
      const health = distributionMonitor.getHealth();
      expect(health.successRate).toBe(2/3);
    });

    it('should generate health alerts', () => {
      // Simulate multiple failures
      for (let i = 1; i <= 5; i++) {
        distributionMonitor.recordFailedDistribution(i, 'Error');
      }
      
      const health = distributionMonitor.getHealth();
      expect(health.isHealthy).toBe(false);
      
      const alerts = distributionMonitor.getRecentAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should generate health report', () => {
      distributionMonitor.recordSuccessfulDistribution(10);
      distributionMonitor.recordFailedDistribution(11, 'Error');
      
      const report = distributionMonitor.generateHealthReport();
      expect(report).toContain('DISTRIBUTION HEALTH REPORT');
      expect(report).toContain('Last Successful Round: 10');
      expect(report).toContain('Failed Rounds: 11');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete distribution workflow', async () => {
      // Generate distribution list
      const result = await generateAndSubmitDistributionList({ round: 0 });
      const parsedResult = JSON.parse(result);
      
      // Verify distribution list format
      expect(parsedResult).toHaveProperty('node1');
      expect(parsedResult).toHaveProperty('node2');
      expect(parsedResult).toHaveProperty('node3');
      
      // Verify reward amounts
      expect(parsedResult['node1']).toBe(3000000000);
      expect(parsedResult['node2']).toBe(3000000000);
      expect(parsedResult['node3']).toBe(0);
      
      // Verify monitoring recorded success
      const health = distributionMonitor.getHealth();
      expect(health.lastSuccessfulRound).toBe(0);
      expect(health.totalRoundsProcessed).toBe(1);
    });

    it('should handle network failures gracefully', async () => {
      const { namespaceWrapper } = require('@_koii/task-manager/namespace-wrapper');
      namespaceWrapper.getTaskSubmissionInfo.mockRejectedValue(new Error('Network error'));
      
      try {
        await generateAndSubmitDistributionList({ round: 0 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Network error');
      }
      
      // Verify monitoring recorded failure
      const health = distributionMonitor.getHealth();
      expect(health.failedRounds).toContain(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large number of nodes', async () => {
      // Create 1000 nodes
      const manyNodes: any = {};
      const manyStakes: any = {};
      
      for (let i = 0; i < 1000; i++) {
        const nodeId = `node${i}`;
        manyNodes[nodeId] = { submission_value: '{"uptime":3600}', slot: 1000 + i, round: 0 };
        manyStakes[nodeId] = 1000;
      }
      
      mockTaskData.submissions[0] = manyNodes;
      mockStakeData.stake_list = manyStakes;
      
      const result = await generateAndSubmitDistributionList({ round: 0 });
      const parsedResult = JSON.parse(result);
      
      expect(Object.keys(parsedResult).length).toBe(1000);
      expect(parsedResult['node0']).toBe(3000000000);
      expect(parsedResult['node999']).toBe(3000000000);
    });

    it('should handle malformed submission data', async () => {
      mockTaskData.submissions[0] = {
        'node1': { submission_value: 'invalid json', slot: 1000, round: 0 }
      };
      
      const result = await generateAndSubmitDistributionList({ round: 0 });
      expect(result).not.toBe('{}');
    });

    it('should handle missing audit triggers', async () => {
      mockTaskData.submissions_audit_trigger = {};
      
      const result = await generateAndSubmitDistributionList({ round: 0 });
      const parsedResult = JSON.parse(result);
      
      // Should default to approved (votes = 1)
      expect(parsedResult['node1']).toBe(3000000000);
      expect(parsedResult['node2']).toBe(3000000000);
      expect(parsedResult['node3']).toBe(3000000000);
    });
  });
}); 