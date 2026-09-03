const schedule = require('node-schedule');
const mongoose = require('mongoose');
const Caregiver = require('../models/Caregiver');
const Patient = require('../models/Patient');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sendNotification } = require('./notificationService');

/**
 * Health Check Service
 * Runs weekly to validate caregiver-patient linkages and send notifications
 * 
 * Checks:
 * 1. Bidirectional linkage consistency (Caregiver.patients <-> Patient.caregiver)
 * 2. User account status (both users still exist and active)
 * 3. Broken or orphaned links
 * 4. Dormant patient accounts (no activity in 30 days)
 * 5. Sends notifications about health issues
 */

class HealthCheckService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start the health check service
   */
  start() {
    if (this.isRunning) {
      console.log('[Health Check Service] Service already running');
      return;
    }

    // Schedule health check to run every Sunday at 2:00 AM (off-peak)
    const healthCheckJob = schedule.scheduleJob('0 2 * * 0', async () => {
      await this.runHealthCheck();
    });

    this.jobs.push(healthCheckJob);
    this.isRunning = true;
    console.log('[Health Check Service] Service started - health check scheduled for Sundays at 2:00 AM');

    // Run initial health check on startup (async, no await)
    this.runHealthCheck().catch(err => {
      console.error('[Health Check Service] Initial health check failed:', err.message);
    });
  }

  /**
   * Stop the health check service and cancel all jobs
   */
  stop() {
    if (!this.isRunning) return;

    this.jobs.forEach(job => job.cancel());
    this.jobs = [];
    this.isRunning = false;
    console.log('[Health Check Service] Service stopped');
  }

  /**
   * Main health check routine
   */
  async runHealthCheck() {
    const startTime = new Date();
    console.log('[Health Check Service] Running health check...');

    try {
      const results = {
        totalCaregivers: 0,
        totalPatients: 0,
        healthyLinks: 0,
        brokenBidirectionalLinks: 0,
        orphanedPatients: 0,
        inactivePatients: 0,
        deletedAccounts: 0,
        issues: []
      };

      // Get all caregivers
      const caregivers = await Caregiver.find()
        .populate('user')
        .populate({
          path: 'patients',
          populate: { path: 'user' }
        });

      results.totalCaregivers = caregivers.length;

      // Check each caregiver's patient links
      for (const caregiver of caregivers) {
        if (!caregiver.user) {
          results.deletedAccounts++;
          results.issues.push({
            type: 'DELETED_CAREGIVER_ACCOUNT',
            caregiverId: caregiver._id,
            caregiverEmail: 'unknown',
            severity: 'critical',
            message: 'Caregiver account deleted but Caregiver record still exists'
          });
          continue;
        }

        for (const patientUserId of caregiver.patients) {
          try {
            // Fetch patient record
            const patient = await Patient.findOne({ user: patientUserId })
              .populate('user');

            if (!patient) {
              results.orphanedPatients++;
              results.issues.push({
                type: 'ORPHANED_PATIENT',
                caregiverId: caregiver._id,
                caregiverEmail: caregiver.user.email,
                patientUserId,
                severity: 'high',
                message: 'Patient record deleted but caregiver still lists them'
              });
              continue;
            }

            if (!patient.user) {
              results.deletedAccounts++;
              results.issues.push({
                type: 'DELETED_PATIENT_ACCOUNT',
                caregiverId: caregiver._id,
                caregiverEmail: caregiver.user.email,
                patientId: patient._id,
                severity: 'high',
                message: 'Patient user account deleted but Patient record still exists'
              });
              continue;
            }

            // Check bidirectional consistency
            if (!patient.caregiver || patient.caregiver.toString() !== caregiver.user._id.toString()) {
              results.brokenBidirectionalLinks++;
              results.issues.push({
                type: 'BROKEN_BIDIRECTIONAL_LINK',
                caregiverId: caregiver._id,
                caregiverEmail: caregiver.user.email,
                patientId: patient._id,
                patientEmail: patient.user.email,
                severity: 'high',
                message: 'Caregiver-patient link is unidirectional (not mutual)'
              });

              // Auto-fix: Update patient caregiver if blank
              if (!patient.caregiver) {
                patient.caregiver = caregiver.user._id;
                await patient.save();
                console.log(`[Health Check Service] Auto-fixed broken link for patient ${patient.user.email}`);
              }
              continue;
            }

            // Check for inactive patients (no activity in 30 days)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const recentActivity = await ActivityLog.findOne({
              userId: patientUserId,
              timestamp: { $gte: thirtyDaysAgo }
            });

            if (!recentActivity) {
              results.inactivePatients++;
              results.issues.push({
                type: 'INACTIVE_PATIENT',
                caregiverId: caregiver._id,
                caregiverEmail: caregiver.user.email,
                patientId: patient._id,
                patientEmail: patient.user.email,
                severity: 'low',
                message: `Patient has no activity for 30 days (last activity: ${patient.lastActivityDate || 'never'})`
              });
            }

            results.healthyLinks++;

          } catch (err) {
            console.error(`[Health Check Service] Error checking patient ${patientUserId}:`, err.message);
            results.issues.push({
              type: 'CHECK_ERROR',
              caregiverId: caregiver._id,
              caregiverEmail: caregiver.user.email,
              patientUserId,
              severity: 'medium',
              message: `Error during health check: ${err.message}`
            });
          }
        }
      }

      results.totalPatients = await Patient.countDocuments();

      // Send notifications to caregivers about their issues
      await this.notifyAboutIssues(results.issues);

      // Log health check result
      const duration = Date.now() - startTime.getTime();
      console.log(`[Health Check Service] Health check complete in ${duration}ms`);
      console.log(`[Health Check Service] Results:`, {
        totalCaregivers: results.totalCaregivers,
        totalPatients: results.totalPatients,
        healthyLinks: results.healthyLinks,
        brokenBidirectionalLinks: results.brokenBidirectionalLinks,
        orphanedPatients: results.orphanedPatients,
        inactivePatients: results.inactivePatients,
        deletedAccounts: results.deletedAccounts,
        totalIssues: results.issues.length
      });

      // Save health check result to ActivityLog
      if (ActivityLog) {
        try {
          const adminUser = await User.findOne({ role: 'admin' });
          if (adminUser) {
            await ActivityLog.create({
              userId: adminUser._id,
              action: 'HEALTH_CHECK_COMPLETED',
              resourceType: 'system',
              resourceId: 'health-check',
              details: {
                results,
                duration
              },
              status: 'success'
            });
          }
        } catch (err) {
          console.error('[Health Check Service] Failed to log health check result:', err.message);
        }
      }

      return results;

    } catch (err) {
      console.error('[Health Check Service] Health check failed:', err.message);
      console.error(err.stack);

      // Log failure to ActivityLog
      if (ActivityLog) {
        try {
          const adminUser = await User.findOne({ role: 'admin' });
          if (adminUser) {
            await ActivityLog.create({
              userId: adminUser._id,
              action: 'HEALTH_CHECK_FAILED',
              resourceType: 'system',
              resourceId: 'health-check',
              details: {
                error: err.message
              },
              status: 'error'
            });
          }
        } catch (logErr) {
          console.error('[Health Check Service] Failed to log health check error:', logErr.message);
        }
      }
    }
  }

  /**
   * Send notifications to caregivers about health issues with their patients
   */
  async notifyAboutIssues(issues) {
    // Group issues by caregiver
    const issuesByCaregiver = {};

    for (const issue of issues) {
      if (!issue.caregiverId) continue;

      const caregiverId = issue.caregiverId.toString();
      if (!issuesByCaregiver[caregiverId]) {
        issuesByCaregiver[caregiverId] = [];
      }
      issuesByCaregiver[caregiverId].push(issue);
    }

    // Send notifications
    for (const [caregiverId, caregiverIssues] of Object.entries(issuesByCaregiver)) {
      try {
        const caregiver = await Caregiver.findById(caregiverId).populate('user');
        if (!caregiver || !caregiver.user) continue;

        // Only notify if notifications are enabled
        if (!caregiver.notificationsEnabled) continue;

        // Filter issues by severity and construct message
        const criticalIssues = caregiverIssues.filter(i => i.severity === 'critical');
        const highSeverity = caregiverIssues.filter(i => i.severity === 'high');
        const lowSeverity = caregiverIssues.filter(i => i.severity === 'low');

        let message = 'Health Check Alert: ';
        let title = 'DementiaCare+ Health Check';

        if (criticalIssues.length > 0) {
          message += `${criticalIssues.length} critical issue(s) detected. `;
          title = '⚠️ Critical Health Check Alert';
        } else if (highSeverity.length > 0) {
          message += `${highSeverity.length} issue(s) found with your patient links. `;
        } else if (lowSeverity.length > 0) {
          message += `${lowSeverity.length} notice(s) about patient activity. `;
        }

        message += 'Please review your patient linkages and activity.';

        // Send notification
        await sendNotification({
          userId: caregiver.user._id,
          title,
          body: message,
          type: 'HEALTH_CHECK_ALERT',
          data: {
            issuesCount: caregiverIssues.length,
            criticalCount: criticalIssues.length,
            highCount: highSeverity.length,
            lowCount: lowSeverity.length
          }
        });

        console.log(`[Health Check Service] Notification sent to caregiver ${caregiver.user.email} (${caregiverIssues.length} issues)`);

      } catch (err) {
        console.error(`[Health Check Service] Failed to send notification for caregiver ${caregiverId}:`, err.message);
      }
    }
  }

  /**
   * Manually trigger a health check (for testing/admin endpoints)
   */
  async manualHealthCheck() {
    console.log('[Health Check Service] Manual health check triggered');
    return await this.runHealthCheck();
  }

  /**
   * Get the status of the health check service
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobsScheduled: this.jobs.length,
      nextRun: this.jobs.length > 0 ? this.jobs[0].nextInvocation() : null
    };
  }
}

// Singleton instance
const healthCheckService = new HealthCheckService();

module.exports = healthCheckService;
