/**
 * Moderation Service Tests
 * Tests for content filtering and flagging
 */

const moderationService = require('../../services/moderationService');

// Mock dependencies
jest.mock('../../models/FamilyMemory');
jest.mock('../../models/ModerationFlag');
jest.mock('../../models/User');
jest.mock('../../services/notificationService');

describe('Moderation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('moderateText', () => {
    it('should pass clean text without flagging', async () => {
      const text = 'This is a lovely memory of my grandmother at the beach';
      
      const result = await moderationService.moderateText(text);
      
      expect(result.isFlagged).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should flag text with inappropriate keywords', async () => {
      const text = 'This memory involves violence and abuse';
      
      const result = await moderationService.moderateText(text);
      
      expect(result.isFlagged).toBe(true);
      expect(result.reason).toBe('inappropriate_text');
      expect(result.severity).toBe('medium');
    });

    it('should detect PII - Social Security Number', async () => {
      const text = 'My SSN is 123-45-6789';
      
      const result = await moderationService.moderateText(text);
      
      expect(result.isFlagged).toBe(true);
      expect(result.reason).toBe('personal_info_exposed');
      expect(result.severity).toBe('high');
    });

    it('should detect PII - Credit card', async () => {
      const text = 'My card is 4532-1234-5678-9010';
      
      const result = await moderationService.moderateText(text);
      
      expect(result.isFlagged).toBe(true);
      expect(result.reason).toBe('personal_info_exposed');
      expect(result.severity).toBe('high');
    });

    it('should detect excessive caps (aggression indicator)', async () => {
      const text = 'THIS IS A TERRIBLE MEMORY AND I HATE IT';
      
      const result = await moderationService.moderateText(text);
      
      expect(result.isFlagged).toBe(true);
    });

    it('should handle empty text', async () => {
      const result = await moderationService.moderateText('');
      
      expect(result.isFlagged).toBe(false);
      expect(result.severity).toBe('low');
    });

    it('should handle null text', async () => {
      const result = await moderationService.moderateText(null);
      
      expect(result.isFlagged).toBe(false);
    });
  });

  describe('moderateImage', () => {
    it('should return safe analysis for images', async () => {
      const buffer = Buffer.from('test image data');
      
      const result = await moderationService.moderateImage(buffer);
      
      expect(result.isFlagged).toBe(false);
      expect(result.imageAnalysis).toHaveProperty('nsfw_probability');
    });

    it('should handle image analysis errors gracefully', async () => {
      const buffer = null; // Invalid buffer
      
      const result = await moderationService.moderateImage(buffer);
      
      // Should fail open (not flag on error)
      expect(result.isFlagged).toBe(false);
    });
  });

  describe('flagMemory', () => {
    it('should create a moderation flag for memory', async () => {
      const FamilyMemory = require('../../models/FamilyMemory');
      const ModerationFlag = require('../../models/ModerationFlag');

      const mockMemory = {
        _id: 'memory123',
        patient: { _id: 'patient123' },
        title: 'Test Memory',
        moderation: {},
        save: jest.fn()
      };

      FamilyMemory.findById.mockResolvedValueOnce(mockMemory);
      ModerationFlag.create.mockResolvedValueOnce({
        _id: 'flag123',
        reason: 'inappropriate_text',
        severity: 'medium'
      });

      const result = await moderationService.flagMemory(
        'memory123',
        'inappropriate_text',
        'medium',
        {}
      );

      expect(result).toHaveProperty('_id');
      expect(ModerationFlag.create).toHaveBeenCalled();
      expect(mockMemory.save).toHaveBeenCalled();
    });

    it('should handle memory not found', async () => {
      const FamilyMemory = require('../../models/FamilyMemory');
      FamilyMemory.findById.mockResolvedValueOnce(null);

      await expect(
        moderationService.flagMemory('invalid', 'spam', 'low')
      ).rejects.toThrow('Memory not found');
    });
  });

  describe('resolveFlag', () => {
    it('should approve and blur flagged content', async () => {
      const ModerationFlag = require('../../models/ModerationFlag');
      const FamilyMemory = require('../../models/FamilyMemory');

      const mockFlag = {
        _id: 'flag123',
        resourceId: 'memory123',
        save: jest.fn()
      };

      const mockMemory = {
        _id: 'memory123',
        moderation: {},
        save: jest.fn()
      };

      ModerationFlag.findById.mockResolvedValueOnce(mockFlag);
      FamilyMemory.findById.mockResolvedValueOnce(mockMemory);

      await moderationService.resolveFlag('flag123', 'admin123', 'blur', 'Sensitive');

      expect(mockFlag.save).toHaveBeenCalled();
      expect(mockFlag.status).toBe('approved');
      expect(mockFlag.action).toBe('blur');
    });

    it('should delete flagged content', async () => {
      const ModerationFlag = require('../../models/ModerationFlag');
      const FamilyMemory = require('../../models/FamilyMemory');

      const mockFlag = {
        _id: 'flag123',
        resourceId: 'memory123',
        save: jest.fn()
      };

      const mockMemory = {
        _id: 'memory123',
        moderation: {},
        save: jest.fn()
      };

      ModerationFlag.findById.mockResolvedValueOnce(mockFlag);
      FamilyMemory.findById.mockResolvedValueOnce(mockMemory);

      await moderationService.resolveFlag('flag123', 'admin123', 'delete', 'Harmful');

      expect(mockFlag.action).toBe('delete');
    });
  });

  describe('rejectFlag', () => {
    it('should reject a flag and approve content', async () => {
      const ModerationFlag = require('../../models/ModerationFlag');
      const FamilyMemory = require('../../models/FamilyMemory');

      const mockFlag = {
        _id: 'flag123',
        resourceId: 'memory123',
        save: jest.fn()
      };

      const mockMemory = {
        _id: 'memory123',
        moderation: {},
        save: jest.fn()
      };

      ModerationFlag.findById.mockResolvedValueOnce(mockFlag);
      FamilyMemory.findById.mockResolvedValueOnce(mockMemory);

      await moderationService.rejectFlag('flag123', 'admin123', 'False positive');

      expect(mockFlag.status).toBe('rejected');
      expect(mockFlag.action).toBe('none');
      expect(mockMemory.moderation.isFlagged).toBe(false);
    });
  });

  describe('getPendingFlags', () => {
    it('should retrieve pending flags', async () => {
      const ModerationFlag = require('../../models/ModerationFlag');

      const mockFlags = [
        { _id: 'flag1', reason: 'inappropriate_text', severity: 'medium' },
        { _id: 'flag2', reason: 'sensitive_image', severity: 'high' }
      ];

      ModerationFlag.find.mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            sort: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce(mockFlags)
            })
          })
        })
      });

      const result = await moderationService.getPendingFlags(20);

      expect(result).toEqual(mockFlags);
    });
  });

  describe('getStatistics', () => {
    it('should aggregate moderation statistics', async () => {
      const ModerationFlag = require('../../models/ModerationFlag');

      ModerationFlag.countDocuments
        .mockResolvedValueOnce(5)  // flagged
        .mockResolvedValueOnce(2)  // reviewing
        .mockResolvedValueOnce(10) // approved
        .mockResolvedValueOnce(1); // rejected

      ModerationFlag.aggregate
        .mockResolvedValueOnce([{ _id: 'inappropriate_text', count: 3 }])
        .mockResolvedValueOnce([{ _id: 'high', count: 2 }]);

      const stats = await moderationService.getStatistics();

      expect(stats.pending).toBe(5);
      expect(stats.approved).toBe(10);
      expect(stats.rejected).toBe(1);
    });
  });
});
