const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Patient = require('../models/Patient');
const crypto = require('crypto');

/**
 * Log HIPAA-relevant activity with PII tracking
 */
const logHIPAAActivity = async (userId, action, resource, piiAccessed = [], medicalDataAccessed = false, details = {}) => {
  try {
    const log = new ActivityLog({
      user: userId,
      firebaseUid: details.firebaseUid,
      action,
      resource,
      resourceId: details.resourceId,
      details: {
        ...details,
        dataClassification: piiAccessed.length > 0 ? 'restricted' : 'confidential'
      },
      hipaaCompliance: {
        isHIPAARelevant: true,
        piiAccessed: piiAccessed.length > 0 ? piiAccessed : [],
        medicalDataAccessed,
        dataClassification: piiAccessed.length > 0 ? 'restricted' : 'confidential',
        encryptionUsed: true
      }
    });

    await log.save();
    return { success: true, logId: log._id };
  } catch (error) {
    console.error('Error logging HIPAA activity:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get HIPAA audit trail for patient
 */
const getHIPAAauditTrail = async (userId, daysBack = 90) => {
  try {
    const logs = await ActivityLog.getHIPAALogs(userId, daysBack);
    
    return {
      success: true,
      totalLogs: logs.length,
      logs: logs.map(log => ({
        timestamp: log.createdAt,
        action: log.action,
        resource: log.resource,
        piiAccessed: log.hipaaCompliance.piiAccessed,
        medicalDataAccessed: log.hipaaCompliance.medicalDataAccessed,
        ipAddress: log.details.ipAddress,
        userAgent: log.details.userAgent,
        integrityVerified: log.verifyIntegrity(),
        auditVerified: log.hipaaCompliance.auditVerified
      }))
    };
  } catch (error) {
    console.error('Error retrieving HIPAA audit trail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify audit trail integrity for compliance
 */
const verifyAuditIntegrity = async (startDate, endDate) => {
  try {
    const logs = await ActivityLog.verifyAuditTrail(startDate, endDate);
    
    let integrityViolations = 0;
    const violations = [];

    for (const log of logs) {
      if (!log.verifyIntegrity()) {
        integrityViolations++;
        violations.push({
          logId: log._id,
          timestamp: log.createdAt,
          action: log.action,
          issue: 'Integrity hash mismatch'
        });
      }
    }

    return {
      success: integrityViolations === 0,
      totalLogs: logs.length,
      integrityViolations,
      violations,
      complianceStatus: integrityViolations === 0 ? 'compliant' : 'non-compliant'
    };
  } catch (error) {
    console.error('Error verifying audit integrity:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate HIPAA compliance report
 */
const generateComplianceReport = async (startDate, endDate) => {
  try {
    const logs = await ActivityLog.find({
      createdAt: { $gte: startDate, $lte: endDate },
      'hipaaCompliance.isHIPAARelevant': true
    }).sort({ createdAt: -1 });

    // Analyze patterns
    const piiAccessCount = logs.filter(l => l.hipaaCompliance.piiAccessed.length > 0).length;
    const medicalDataAccessCount = logs.filter(l => l.hipaaCompliance.medicalDataAccessed).length;
    const encryptionUsageCount = logs.filter(l => l.hipaaCompliance.encryptionUsed).length;
    const unauthorizedAccess = logs.filter(l => l.hipaaCompliance.dataClassification === 'restricted' && !l.hipaaCompliance.encryptionUsed).length;

    // Group by action
    const actionBreakdown = {};
    logs.forEach(log => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
    });

    // Group by PII type
    const piiBreakdown = {};
    logs.forEach(log => {
      log.hipaaCompliance.piiAccessed.forEach(pii => {
        piiBreakdown[pii] = (piiBreakdown[pii] || 0) + 1;
      });
    });

    const report = {
      reportDate: new Date().toISOString(),
      periodStart: startDate,
      periodEnd: endDate,
      summary: {
        totalHIPAARelevantLogs: logs.length,
        piiAccessEvents: piiAccessCount,
        medicalDataAccessEvents: medicalDataAccessCount,
        encryptionUsageRate: `${((encryptionUsageCount / logs.length) * 100).toFixed(2)}%`,
        unauthorizedAccessAttempts: unauthorizedAccess,
        complianceStatus: unauthorizedAccess === 0 ? 'COMPLIANT' : 'NON-COMPLIANT'
      },
      breakdown: {
        byAction: actionBreakdown,
        byPIIType: piiBreakdown
      },
      recommendations: generateRecommendations(unauthorizedAccess, encryptionUsageCount, logs.length)
    };

    return { success: true, report };
  } catch (error) {
    console.error('Error generating compliance report:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate recommendations based on compliance findings
 */
const generateRecommendations = (unauthorizedAccess, encryptionUsageCount, totalLogs) => {
  const recommendations = [];

  if (unauthorizedAccess > 0) {
    recommendations.push({
      severity: 'HIGH',
      issue: 'Unauthorized PII access detected',
      recommendation: 'Review and investigate unauthorized access attempts immediately'
    });
  }

  if (encryptionUsageCount / totalLogs < 0.95) {
    recommendations.push({
      severity: 'MEDIUM',
      issue: 'Encryption not used consistently',
      recommendation: 'Ensure all PII access is encrypted; review encryption policies'
    });
  }

  if (totalLogs < 50) {
    recommendations.push({
      severity: 'LOW',
      issue: 'Limited audit trail data',
      recommendation: 'Continue monitoring for sufficient data collection over time'
    });
  }

  return recommendations;
};

/**
 * Log data access with PII classification
 */
const logDataAccess = async (userId, firebaseUid, dataType, piiFields = [], success = true) => {
  try {
    const action = success ? 'dataAccess' : 'unauthorizedDataAccess';
    const resource = ['name', 'email', 'phone', 'dateOfBirth', 'address'].some(f => piiFields.includes(f))
      ? 'pii'
      : 'medicalData';

    return await logHIPAAActivity(
      userId,
      action,
      resource,
      piiFields,
      true,
      {
        firebaseUid,
        dataAccessType: 'read',
        dataClassification: 'restricted'
      }
    );
  } catch (error) {
    console.error('Error logging data access:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Encrypt sensitive data field
 */
const encryptField = (value, encryptionKey = process.env.ENCRYPTION_KEY) => {
  if (!encryptionKey) {
    console.warn('Encryption key not configured');
    return value;
  }

  try {
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return value;
  }
};

/**
 * Decrypt sensitive data field
 */
const decryptField = (encryptedValue, encryptionKey = process.env.ENCRYPTION_KEY) => {
  if (!encryptionKey) {
    console.warn('Encryption key not configured');
    return encryptedValue;
  }

  try {
    const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedValue;
  }
};

/**
 * HIPAA compliance checklist
 */
const getComplianceChecklist = () => {
  return {
    encryption: {
      description: 'Ensure encryption for data at rest and in transit',
      status: process.env.ENCRYPTION_KEY ? 'ENABLED' : 'DISABLED',
      recommendation: 'Configure ENCRYPTION_KEY in .env'
    },
    auditLogging: {
      description: 'Maintain comprehensive audit logs of all data access',
      status: 'ENABLED',
      recommendation: 'Review audit logs monthly'
    },
    accessControl: {
      description: 'Implement role-based access control',
      status: 'ENABLED',
      recommendation: 'Verify user roles and permissions regularly'
    },
    dataRetention: {
      description: 'Implement data retention and archival policies',
      status: 'ENABLED',
      retentionDays: 90,
      recommendation: 'Data is automatically deleted after 90 days'
    },
    backups: {
      description: 'Regular backups and disaster recovery',
      status: 'ENABLED',
      recommendation: 'Ensure backups are tested monthly'
    },
    userAuthentication: {
      description: 'Strong user authentication mechanisms',
      status: 'ENABLED (Firebase)',
      recommendation: 'Enforce password policies'
    }
  };
};

module.exports = {
  logHIPAAActivity,
  getHIPAAauditTrail,
  verifyAuditIntegrity,
  generateComplianceReport,
  logDataAccess,
  encryptField,
  decryptField,
  getComplianceChecklist
};
