# Uptime Tracking Feature

## Overview

The uptime tracking feature has been added to your InfraScan task to monitor and record node uptime every round (hourly). This feature provides comprehensive uptime analytics including daily, weekly, and monthly statistics with 95% uptime eligibility checking.

## Features

### Core Functionality
- **Node Uptime Tracking**: Tracks node uptime (not OS uptime) from task initialization
- **Hourly Recording**: Records uptime data every task round (1 hour)
- **Local Database Storage**: Stores uptime records locally with automatic cleanup (30 days retention)
- **Statistics Calculation**: Calculates daily, weekly, and monthly uptime percentages
- **95% Eligibility Check**: Monitors monthly uptime for 95%+ requirement compliance

### Data Tracking
- **Per Round**: Timestamp, date, round number, uptime duration, online status
- **Daily Stats**: 24-hour uptime percentage calculation
- **Weekly Stats**: 7-day uptime percentage calculation
- **Monthly Stats**: Calendar month uptime percentage calculation

## API Endpoints

The following REST API endpoints are available for accessing uptime data:

### Core Endpoints
- `GET /uptime/current` - Current uptime and summary
- `GET /uptime/records` - All uptime records (last 30 days)
- `GET /uptime/stats` - Daily, weekly, and monthly statistics
- `GET /uptime/report?nodeId=<id>` - Comprehensive uptime report
- `GET /uptime/eligibility` - 95% uptime eligibility status

### Data Export
- `GET /uptime/export` - Export data for web database upload
- `GET /uptime/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Date range statistics

### Administrative
- `POST /uptime/reset` - Reset uptime tracking (for maintenance)
- `GET /health` - Health check with uptime summary
- `GET /uptime/leaderboard` - Leaderboard data (future feature)

## Usage

### Task Integration
The uptime tracking is automatically integrated into your task:

1. **Setup Phase**: Uptime tracker initializes when the task starts
2. **Task Execution**: Records uptime data every round
3. **Submission**: Includes uptime data in task submissions

### Accessing Data
```bash
# Get current uptime
curl http://localhost:8080/uptime/current

# Get monthly eligibility
curl http://localhost:8080/uptime/eligibility

# Get comprehensive report
curl http://localhost:8080/uptime/report?nodeId=my-node-id

# Export data for web upload
curl http://localhost:8080/uptime/export
```

### Example API Responses

#### Current Uptime Response
```json
{
  "uptimeSeconds": 3600,
  "summary": "Node Uptime: 0d 1h 0m | Monthly: 100.00% | Eligible: Yes",
  "timestamp": 1672531200000
}
```

#### Eligibility Response
```json
{
  "isEligible": true,
  "monthlyUptime": 98.75,
  "requiredUptime": 95,
  "timestamp": 1672531200000
}
```

## Implementation Details

### Files Added
- `src/task/uptime-tracker.ts` - Core uptime tracking functionality
- `src/task/uptime-utils.ts` - Utility functions and reporting
- `UPTIME_FEATURE.md` - This documentation file

### Files Modified
- `src/task/0-setup.ts` - Initialize uptime tracker
- `src/task/1-task.ts` - Record uptime each round
- `src/task/2-submission.ts` - Include uptime data in submissions
- `src/task/5-routes.ts` - Add uptime API endpoints

### Data Storage
- **Local Storage**: Uses namespaceWrapper for local database storage
- **Automatic Cleanup**: Keeps only 30 days of records to manage storage
- **Persistent Tracking**: Maintains node start time across restarts

## Uptime Calculation

### Node Uptime vs OS Uptime
The system tracks **node uptime** (time since task started) rather than operating system uptime. This ensures accurate measurement of task-specific availability.

### Percentage Calculations
- **Daily**: (Hours online / 24) × 100
- **Weekly**: (Hours online / 168) × 100  
- **Monthly**: (Hours online / Hours in month) × 100

### 95% Eligibility
Monthly uptime must be ≥95% to be eligible for tasks requiring high availability. The system automatically tracks this requirement.

## Web Database Integration

The system is designed for future web database integration:

### Export Format
```json
{
  "nodeId": "unique-node-identifier",
  "exportTimestamp": 1672531200000,
  "records": [...],
  "stats": {...},
  "summary": {...}
}
```

### Upload Preparation
Use the `/uptime/export` endpoint to get data formatted for web database upload. The format includes all necessary metadata for leaderboard and analytics.

## Console Output

The task now displays uptime information in the console:
```
EXECUTE TASK FOR ROUND 1
Uptime Tracker: Recorded uptime for round 1: 1h 0m 0s
Node uptime: 0d 1h 0m
Monthly uptime: 100.00%
```

## Monitoring and Maintenance

### Health Checks
Use the `/health` endpoint to monitor overall system health including uptime status.

### Reset Functionality
The `/uptime/reset` endpoint allows resetting uptime tracking for maintenance windows or testing.

### Data Retention
The system automatically maintains a 30-day rolling window of uptime records to balance storage efficiency with historical data availability.

## Future Enhancements

### Planned Features
- **Web Dashboard**: Visual uptime analytics and leaderboards
- **Multi-Node Comparison**: Compare uptime across multiple nodes
- **Alert System**: Notifications for uptime threshold breaches
- **Historical Analysis**: Long-term uptime trend analysis

### Integration Points
- **Task Rewards**: Link uptime performance to reward calculations
- **Network Requirements**: Automatic eligibility checking for high-availability tasks
- **Leaderboard System**: Public ranking of node operators by uptime

## Support

The uptime tracking system is designed to be robust and self-healing:
- Automatic error handling and fallback mechanisms
- Graceful degradation when storage is unavailable
- Comprehensive logging for troubleshooting

For issues or questions about the uptime tracking feature, check the console logs for detailed error messages and tracking information. 