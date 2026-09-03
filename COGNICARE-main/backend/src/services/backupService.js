const User = require('../models/User');
const Patient = require('../models/Patient');
const Caregiver = require('../models/Caregiver');
const Performance = require('../models/Performance');
const Reminder = require('../models/Reminder');
const FamilyMemory = require('../models/FamilyMemory');
const Note = require('../models/Note');
const SOSAlert = require('../models/SOSAlert');
const CaregiverFeedback = require('../models/CaregiverFeedback');
const CognitiveMetrics = require('../models/CognitiveMetrics');
const EngagementMetrics = require('../models/EngagementMetrics');
const ActivityLog = require('../models/ActivityLog');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

/**
 * Export all patient data as JSON
 */
const exportPatientDataJSON = async (patientId) => {
  try {
    const user = await User.findById(patientId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const patient = await Patient.findOne({ user: patientId });
    const performances = await Performance.find({ patient: patientId });
    const reminders = await Reminder.find({ patient: patientId });
    const memories = await FamilyMemory.find({ patient: patientId });
    const notes = await Note.find({ patient: patientId });
    const sosAlerts = await SOSAlert.find({ patient: patientId });
    const cognitiveMetrics = await CognitiveMetrics.find({ patient: patientId });
    const engagementMetrics = await EngagementMetrics.find({ patient: patientId });
    const activityLogs = await ActivityLog.find({ user: patientId }).limit(1000);

    const exportData = {
      exportDate: new Date().toISOString(),
      disclaimer: 'This is a personal data export from DementiaCare+ platform',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt
      },
      patient: patient ? {
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        cognitiveProfile: patient.cognitiveProfile,
        gameDifficulty: patient.gameDifficulty,
        totalActivitiesCompleted: patient.totalActivitiesCompleted,
        streakDays: patient.streakDays,
        medicalNotes: patient.medicalNotes,
        accessibilitySettings: patient.accessibilitySettings
      } : null,
      gamePerformances: {
        total: performances.length,
        records: performances.map(p => ({
          game: p.gameType,
          difficulty: p.difficulty,
          score: p.score,
          accuracy: p.accuracy,
          completionTime: p.completionTimeSeconds,
          date: p.sessionDate,
          timestamp: p.createdAt
        }))
      },
      reminders: {
        total: reminders.length,
        records: reminders.map(r => ({
          type: r.type,
          title: r.title,
          time: r.time,
          days: r.days,
          isActive: r.isActive,
          createdAt: r.createdAt
        }))
      },
      familyMemories: {
        total: memories.length,
        records: memories.map(m => ({
          type: m.type,
          title: m.title,
          description: m.description,
          personName: m.personName,
          relationship: m.relationship,
          memoryDate: m.memoryDate,
          isFavorite: m.isFavorite,
          createdAt: m.createdAt
        }))
      },
      notes: {
        total: notes.length,
        records: notes.map(n => ({
          title: n.title,
          content: n.content,
          isPinned: n.isPinned,
          color: n.color,
          isTask: n.isTask,
          taskCompleted: n.taskCompleted,
          createdAt: n.createdAt
        }))
      },
      sosAlerts: {
        total: sosAlerts.length,
        records: sosAlerts.map(s => ({
          message: s.message,
          status: s.status,
          createdAt: s.createdAt,
          acknowledgedAt: s.acknowledgedAt,
          resolvedAt: s.resolvedAt
        }))
      },
      cognitiveMetrics: cognitiveMetrics.slice(0, 30), // Last 30 days
      engagementMetrics: engagementMetrics.slice(0, 30), // Last 30 days
      recentActivity: {
        total: activityLogs.length,
        records: activityLogs.map(a => ({
          action: a.action,
          resource: a.resource,
          timestamp: a.createdAt
        }))
      }
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Error exporting patient data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export patient data as CSV (game performance)
 */
const exportPerformanceCSV = async (patientId) => {
  try {
    const performances = await Performance.find({ patient: patientId })
      .sort({ createdAt: -1 });

    if (performances.length === 0) {
      return { success: false, error: 'No performance data to export' };
    }

    const fields = [
      'gameType',
      'difficulty',
      'score',
      'accuracy',
      'completionTimeSeconds',
      'correctAnswers',
      'mistakes',
      'culturalTheme',
      'sessionDate',
      'createdAt'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(performances);

    return { success: true, data: csv, filename: 'game-performance.csv' };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate PDF report of patient data
 */
const generatePatientReportPDF = async (patientId) => {
  return new Promise(async (resolve) => {
    try {
      const user = await User.findById(patientId);
      const patient = await Patient.findOne({ user: patientId });
      const performances = await Performance.find({ patient: patientId })
        .limit(20)
        .sort({ createdAt: -1 });
      const cognitiveMetrics = await CognitiveMetrics.findOne({ patient: patientId })
        .sort({ createdAt: -1 });

      const doc = new PDFDocument({ margin: 50 });
      
      // Collect PDF data
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({ success: true, data: pdfBuffer, filename: 'patient-report.pdf' });
      });

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('DementiaCare+ Patient Report', { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      // Patient Info
      doc.fontSize(14).font('Helvetica-Bold').text('Patient Information');
      doc.fontSize(11).font('Helvetica').text(`Name: ${user.name}`);
      doc.text(`Email: ${user.email}`);
      doc.text(`Language: ${user.preferredLanguage}`);
      if (patient) {
        doc.text(`Activities Completed: ${patient.totalActivitiesCompleted}`);
        doc.text(`Streak Days: ${patient.streakDays}`);
      }
      doc.moveDown();

      // Cognitive Profile
      if (patient) {
        doc.fontSize(14).font('Helvetica-Bold').text('Cognitive Profile');
        doc.fontSize(11).font('Helvetica').text(`Overall Level: ${patient.cognitiveProfile.overallLevel}`);
        doc.text(`Memory Score: ${patient.cognitiveProfile.memoryScore}/100`);
        doc.text(`Attention Score: ${patient.cognitiveProfile.attentionScore}/100`);
        doc.text(`Pattern Score: ${patient.cognitiveProfile.patternScore}/100`);
        doc.moveDown();
      }

      // Recent Performance
      doc.fontSize(14).font('Helvetica-Bold').text('Recent Game Performance');
      if (performances.length > 0) {
        doc.fontSize(10).font('Helvetica');
        performances.forEach(p => {
          doc.text(
            `${p.gameType} (${p.difficulty}): ${p.score} pts, ${p.accuracy}% accuracy`,
            { continued: false }
          );
        });
      } else {
        doc.text('No game data available');
      }
      doc.moveDown();

      // Engagement Metrics
      if (cognitiveMetrics) {
        doc.fontSize(14).font('Helvetica-Bold').text('Latest Metrics');
        doc.fontSize(11).font('Helvetica').text(`Date: ${cognitiveMetrics.date}`);
        doc.text(`Memory Score: ${cognitiveMetrics.memoryScore}`);
        doc.text(`Attention Score: ${cognitiveMetrics.attentionScore}`);
        doc.text(`Pattern Score: ${cognitiveMetrics.patternScore}`);
        doc.text(`Games Played: ${cognitiveMetrics.totalGamesPlayed}`);
        doc.moveDown();
      }

      // Footer
      doc.fontSize(9).text(
        'This report is confidential and contains personal health information.',
        { align: 'center' }
      );
      doc.text(
        'For support, contact: support@dementiacare.local',
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      resolve({ success: false, error: error.message });
    }
  });
};

/**
 * Delete all patient data (GDPR right to be forgotten)
 */
const deletePatientData = async (patientId) => {
  try {
    const user = await User.findById(patientId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Delete all related documents
    await Promise.all([
      Patient.deleteOne({ user: patientId }),
      Performance.deleteMany({ patient: patientId }),
      Reminder.deleteMany({ patient: patientId }),
      FamilyMemory.deleteMany({ patient: patientId }),
      Note.deleteMany({ patient: patientId }),
      SOSAlert.deleteMany({ patient: patientId }),
      CognitiveMetrics.deleteMany({ patient: patientId }),
      EngagementMetrics.deleteMany({ patient: patientId }),
      ActivityLog.deleteMany({ user: patientId }),
      CaregiverFeedback.deleteMany({ patient: patientId })
    ]);

    // Delete user account
    await User.deleteOne({ _id: patientId });

    return { 
      success: true, 
      message: 'All patient data deleted successfully (GDPR compliant)'
    };
  } catch (error) {
    console.error('Error deleting patient data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create scheduled backup snapshot
 */
const createBackupSnapshot = async (userId) => {
  try {
    const timestamp = new Date().toISOString();
    
    // Export patient data
    const exportResult = await exportPatientDataJSON(userId);
    
    if (!exportResult.success) {
      return { success: false, error: exportResult.error };
    }

    // Add backup metadata
    const snapshot = {
      backupId: `backup-${userId}-${Date.now()}`,
      userId,
      timestamp,
      dataSize: JSON.stringify(exportResult.data).length,
      status: 'completed',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      data: exportResult.data
    };

    return { success: true, snapshot };
  } catch (error) {
    console.error('Error creating backup snapshot:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Archive old data (data retention policy)
 */
const archiveOldData = async (daysOld = 365) => {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const results = {
      performancesDeleted: 0,
      remindersDeleted: 0,
      notesDeleted: 0,
      sosAlertsDeleted: 0,
      activityLogsDeleted: 0
    };

    // Delete old Performance records
    const perfResult = await Performance.deleteMany({
      createdAt: { $lt: cutoffDate },
      completed: true
    });
    results.performancesDeleted = perfResult.deletedCount;

    // Delete old Reminder records
    const remResult = await Reminder.deleteMany({
      createdAt: { $lt: cutoffDate },
      isActive: false
    });
    results.remindersDeleted = remResult.deletedCount;

    // Delete old Note records
    const noteResult = await Note.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    results.notesDeleted = noteResult.deletedCount;

    // Delete old SOSAlert records
    const sosResult = await SOSAlert.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: 'resolved'
    });
    results.sosAlertsDeleted = sosResult.deletedCount;

    // Delete old ActivityLog records (should auto-TTL, but manual cleanup)
    const activityResult = await ActivityLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    results.activityLogsDeleted = activityResult.deletedCount;

    return { success: true, results };
  } catch (error) {
    console.error('Error archiving old data:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  exportPatientDataJSON,
  exportPerformanceCSV,
  generatePatientReportPDF,
  deletePatientData,
  createBackupSnapshot,
  archiveOldData
};
