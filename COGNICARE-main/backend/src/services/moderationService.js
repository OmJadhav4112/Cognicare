const ModerationFlag = require('../models/ModerationFlag');
const FamilyMemory = require('../models/FamilyMemory');
const { sendNotification } = require('./notificationService');

/**
 * Content Moderation Service
 * Provides text filtering, image analysis, and content flagging
 * 
 * Features:
 * - Inappropriate text detection
 * - Sensitive image flagging
 * - PII (personally identifiable information) detection
 * - Automatic blurring of sensitive images
 * - Admin review queue management
 */

class ModerationService {
  constructor() {
    // List of inappropriate/harmful keywords and patterns
    this.inappropriateKeywords = [
      'abuse', 'violence', 'hate', 'harassment', 'threat',
      'suicide', 'self-harm', 'explicit', 'profan'
    ];

    // PII patterns
    this.piiPatterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/,                     // Social Security Number
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      phone: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/, // Phone
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (may be false positive)
      zipCode: /\b\d{5}(?:-\d{4})?\b/                  // ZIP code
    };

    // Sensitive image detection thresholds
    this.nsfwThreshold = 0.5;                           // NSFW probability threshold (0-1)
  }

  /**
   * Moderate text content
   * Returns: { isFlagged, reason, severity, details }
   */
  async moderateText(text) {
    if (!text) return { isFlagged: false, reason: null, severity: 'low', details: {} };

    const issues = [];
    const triggeredRules = [];
    const matchedPatterns = [];

    // Check for inappropriate keywords
    const textLower = text.toLowerCase();
    for (const keyword of this.inappropriateKeywords) {
      if (textLower.includes(keyword)) {
        issues.push({ type: 'inappropriate_keyword', keyword });
        triggeredRules.push(`inappropriate_keyword:${keyword}`);
        matchedPatterns.push(keyword);
      }
    }

    // Check for PII exposure
    for (const [piiType, pattern] of Object.entries(this.piiPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        issues.push({ type: 'pii_exposure', piiType, matched: matches[0] });
        triggeredRules.push(`pii:${piiType}`);
        matchedPatterns.push(`[${piiType}]`);
      }
    }

    // Check for excessive caps (potential aggression)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.7 && text.length > 20) {
      issues.push({ type: 'excessive_caps' });
      triggeredRules.push('excessive_caps');
    }

    // Determine if flagged and severity
    if (issues.length === 0) {
      return {
        isFlagged: false,
        reason: null,
        severity: 'low',
        details: { triggeredRules: [], matchedPatterns: [], confidence: 0 }
      };
    }

    // Calculate severity based on issue types
    const hasPII = issues.some(i => i.type === 'pii_exposure');
    const hasInappropriate = issues.some(i => i.type === 'inappropriate_keyword');

    let reason = 'inappropriate_text';
    let severity = 'low';

    if (hasPII) {
      reason = 'personal_info_exposed';
      severity = 'high';
    } else if (hasInappropriate) {
      reason = 'inappropriate_text';
      severity = 'medium';
    }

    return {
      isFlagged: true,
      reason,
      severity,
      details: {
        triggeredRules,
        matchedPatterns: [...new Set(matchedPatterns)],
        confidence: Math.min(100, issues.length * 25),
        description: `Detected ${issues.length} content issue(s): ${issues.map(i => i.type).join(', ')}`
      }
    };
  }

  /**
   * Moderate image (simulated - in production, use Google Vision API or similar)
   * Returns: { isFlagged, reason, severity, imageAnalysis }
   */
  async moderateImage(imageBuffer, imageUrl = null) {
    // In a production environment, this would call:
    // - Google Cloud Vision API (for NSFW/explicit content detection)
    // - AWS Rekognition (for face detection, explicit content)
    // - Custom ML models for sensitivity detection
    
    // For now, we'll provide a framework that can be easily extended

    try {
      const analysis = {
        isBlurred: false,
        blurIntensity: 0,
        nsfw_probability: 0,
        contains_faces: false,
        flaggedRegions: []
      };

      // TODO: Integrate with external API
      // For demo purposes, we'll return clean analysis
      // In production, replace with actual API call:
      // const response = await callVisionAPI(imageBuffer);
      // analysis.nsfw_probability = response.nsfw_probability;
      // analysis.contains_faces = response.faces.length > 0;
      // etc.

      // For now, simulate low-risk image
      if (analysis.nsfw_probability > this.nsfwThreshold) {
        return {
          isFlagged: true,
          reason: 'sensitive_image',
          severity: 'high',
          imageAnalysis: {
            ...analysis,
            isBlurred: true,
            blurIntensity: 80
          }
        };
      }

      return {
        isFlagged: false,
        reason: null,
        severity: 'low',
        imageAnalysis: analysis
      };

    } catch (err) {
      console.error('[Moderation Service] Error analyzing image:', err.message);
      // Fail open - don't flag on error
      return {
        isFlagged: false,
        reason: null,
        severity: 'low',
        imageAnalysis: { nsfw_probability: 0, contains_faces: false }
      };
    }
  }

  /**
   * Flag memory content for review
   */
  async flagMemory(memoryId, reason, severity = 'medium', details = {}, flaggedBy = 'system') {
    try {
      const memory = await FamilyMemory.findById(memoryId).populate('patient');
      if (!memory) {
        throw new Error('Memory not found');
      }

      // Create moderation flag
      const flag = await ModerationFlag.create({
        resourceType: 'FamilyMemory',
        resourceId: memoryId,
        patient: memory.patient._id,
        flaggedBy,
        reason,
        severity,
        details: {
          triggeredRules: details.triggeredRules || [],
          matchedPatterns: details.matchedPatterns || [],
          confidence: details.confidence || 0,
          description: details.description || ''
        },
        imageAnalysis: details.imageAnalysis || {}
      });

      // Update memory moderation status
      const action = reason === 'sensitive_image' ? 'blur' : 'none';
      const blurIntensity = details.imageAnalysis?.blurIntensity || 0;

      memory.moderation = {
        isFlagged: true,
        flagReason: reason,
        flagSeverity: severity,
        isBlurred: action === 'blur',
        blurIntensity: blurIntensity,
        reviewStatus: 'pending',
        moderationFlag: flag._id
      };
      await memory.save();

      console.log(`[Moderation Service] Memory ${memoryId} flagged: ${reason} (${severity})`);

      // Notify admin about high-severity flags
      if (severity === 'high' || severity === 'critical') {
        await this.notifyAdminAboutFlag(flag, memory);
      }

      return flag;

    } catch (err) {
      console.error('[Moderation Service] Error flagging memory:', err.message);
      throw err;
    }
  }

  /**
   * Review and resolve a flagged memory
   */
  async resolveFlag(flagId, reviewedBy, action, reviewNotes = '') {
    try {
      const flag = await ModerationFlag.findById(flagId);
      if (!flag) {
        throw new Error('Moderation flag not found');
      }

      // Update flag status
      flag.status = 'approved';
      flag.reviewedBy = reviewedBy;
      flag.reviewedAt = new Date();
      flag.reviewNotes = reviewNotes;
      flag.action = action;
      flag.actionTaken = true;
      await flag.save();

      // Update memory based on action
      const memory = await FamilyMemory.findById(flag.resourceId);
      if (memory) {
        if (action === 'blur') {
          memory.moderation.isBlurred = true;
          memory.moderation.blurIntensity = 80;
        } else if (action === 'hide') {
          memory.usedInGames = false; // Hide from games
        } else if (action === 'delete') {
          // Will be deleted separately by admin
        }

        memory.moderation.reviewStatus = 'approved';
        memory.moderation.moderationNotes = reviewNotes;
        await memory.save();
      }

      console.log(`[Moderation Service] Flag ${flagId} resolved with action: ${action}`);
      return flag;

    } catch (err) {
      console.error('[Moderation Service] Error resolving flag:', err.message);
      throw err;
    }
  }

  /**
   * Reject a flag (content is acceptable)
   */
  async rejectFlag(flagId, reviewedBy, reviewNotes = '') {
    try {
      const flag = await ModerationFlag.findById(flagId);
      if (!flag) {
        throw new Error('Moderation flag not found');
      }

      // Update flag
      flag.status = 'rejected';
      flag.reviewedBy = reviewedBy;
      flag.reviewedAt = new Date();
      flag.reviewNotes = reviewNotes;
      flag.action = 'none';
      flag.actionTaken = false;
      await flag.save();

      // Clear moderation status on memory
      const memory = await FamilyMemory.findById(flag.resourceId);
      if (memory) {
        memory.moderation.reviewStatus = 'approved';
        memory.moderation.isFlagged = false;
        await memory.save();
      }

      console.log(`[Moderation Service] Flag ${flagId} rejected`);
      return flag;

    } catch (err) {
      console.error('[Moderation Service] Error rejecting flag:', err.message);
      throw err;
    }
  }

  /**
   * Get flagged memories requiring review
   */
  async getPendingFlags(limit = 20, severity = null) {
    try {
      const filter = { status: 'flagged' };
      if (severity) {
        filter.severity = severity;
      }

      const flags = await ModerationFlag.find(filter)
        .populate('patient', 'email firstName')
        .populate('resourceId')
        .sort({ severity: -1, createdAt: -1 })
        .limit(limit);

      return flags;

    } catch (err) {
      console.error('[Moderation Service] Error getting pending flags:', err.message);
      throw err;
    }
  }

  /**
   * Notify admin about flagged content
   */
  async notifyAdminAboutFlag(flag, memory) {
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' });

      for (const admin of admins) {
        await sendNotification({
          userId: admin._id,
          title: `⚠️ Content Moderation Alert`,
          body: `Memory "${memory.title}" flagged for review (${flag.severity})`,
          type: 'MODERATION_ALERT',
          data: {
            flagId: flag._id.toString(),
            reason: flag.reason,
            severity: flag.severity
          }
        });
      }

      flag.notificationSent = true;
      flag.notificationSentAt = new Date();
      await flag.save();

    } catch (err) {
      console.error('[Moderation Service] Error notifying admin:', err.message);
    }
  }

  /**
   * Blur image using Sharp (if buffer provided)
   * Returns blurred image buffer
   */
  async blurImage(imageBuffer, blurIntensity = 50) {
    try {
      const sharp = require('sharp');
      const intensity = Math.min(100, Math.max(0, blurIntensity));
      const blurSigma = (intensity / 100) * 25; // Range 0-25

      const blurred = await sharp(imageBuffer)
        .blur(blurSigma)
        .toBuffer();

      return blurred;

    } catch (err) {
      console.error('[Moderation Service] Error blurring image:', err.message);
      return imageBuffer; // Return original if blur fails
    }
  }

  /**
   * Get moderation statistics
   */
  async getStatistics() {
    try {
      const flagged = await ModerationFlag.countDocuments({ status: 'flagged' });
      const reviewing = await ModerationFlag.countDocuments({ status: 'reviewing' });
      const approved = await ModerationFlag.countDocuments({ status: 'approved' });
      const rejected = await ModerationFlag.countDocuments({ status: 'rejected' });

      const byReason = await ModerationFlag.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } }
      ]);

      const bySeverity = await ModerationFlag.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]);

      return {
        totalFlags: flagged + reviewing + approved + rejected,
        pending: flagged,
        reviewing,
        approved,
        rejected,
        byReason,
        bySeverity
      };

    } catch (err) {
      console.error('[Moderation Service] Error getting statistics:', err.message);
      throw err;
    }
  }
}

// Singleton instance
const moderationService = new ModerationService();

module.exports = moderationService;
