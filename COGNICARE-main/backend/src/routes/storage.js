const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, restrictTo } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { endpointLimiters } = require('../services/rateLimitService');
const {
  uploadAndOptimizeImage,
  uploadBase64Image,
  deleteImage,
  getSignedUrl,
  getImageMetadata
} = require('../services/storageService');
const FamilyMemory = require('../models/FamilyMemory');

// Configure multer for file uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * @route   POST /api/storage/upload-memory
 * @desc    Upload image for family memory (multipart form)
 * @access  Private (Patient)
 */
router.post(
  '/upload-memory',
  protect,
  restrictTo('patient'),
  endpointLimiters.fileUpload,
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Upload to Firebase Storage
      const result = await uploadAndOptimizeImage(
        req.file.buffer,
        req.file.originalname,
        `memories/patient-${req.user._id}`
      );

      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error });
      }

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          filePath: result.filePath,
          thumbPath: result.thumbPath,
          mainUrl: result.mainUrl,
          thumbUrl: result.thumbUrl,
          size: result.size
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/storage/upload-base64
 * @desc    Upload image from base64 string
 * @access  Private (Patient)
 */
router.post(
  '/upload-base64',
  protect,
  restrictTo('patient'),
  endpointLimiters.fileUpload,
  [
    body('base64').notEmpty().withMessage('Base64 image data is required'),
    body('filename').notEmpty().withMessage('Filename is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { base64, filename } = req.body;

      // Upload to Firebase Storage
      const result = await uploadBase64Image(
        base64,
        filename,
        `memories/patient-${req.user._id}`
      );

      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error });
      }

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          filePath: result.filePath,
          thumbPath: result.thumbPath,
          mainUrl: result.mainUrl,
          thumbUrl: result.thumbUrl,
          size: result.size
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   DELETE /api/storage/image/:memoryId
 * @desc    Delete memory photo from storage
 * @access  Private (Patient)
 */
router.delete(
  '/image/:memoryId',
  protect,
  restrictTo('patient'),
  async (req, res) => {
    try {
      const { memoryId } = req.params;

      // Find memory to get file path
      const memory = await FamilyMemory.findById(memoryId);
      if (!memory) {
        return res.status(404).json({ success: false, message: 'Memory not found' });
      }

      // Verify ownership
      if (memory.patient.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // Delete from storage if photo path is stored
      if (memory.photo && memory.photo.includes('memories/')) {
        await deleteImage(memory.photo);
      }

      // Update memory to remove photo reference
      memory.photo = null;
      await memory.save();

      res.json({
        success: true,
        message: 'Photo deleted',
        data: memory
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   GET /api/storage/image-metadata/:memoryId
 * @desc    Get metadata for memory photo
 * @access  Private (Patient/Caregiver)
 */
router.get(
  '/image-metadata/:memoryId',
  protect,
  async (req, res) => {
    try {
      const { memoryId } = req.params;

      // Find memory
      const memory = await FamilyMemory.findById(memoryId);
      if (!memory) {
        return res.status(404).json({ success: false, message: 'Memory not found' });
      }

      // Verify access
      const isPatient = memory.patient.toString() === req.user._id.toString();
      const isCaregiver = memory.addedBy.toString() === req.user._id.toString();

      if (!isPatient && !isCaregiver) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (!memory.photo) {
        return res.status(404).json({ success: false, message: 'No photo for this memory' });
      }

      // Get metadata
      const result = await getImageMetadata(memory.photo);

      res.json({
        success: result.success,
        data: result.metadata || null,
        message: result.error || 'Metadata retrieved'
      });
    } catch (error) {
      console.error('Metadata error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/storage/refresh-url/:memoryId
 * @desc    Refresh signed URL for memory photo (extends expiry)
 * @access  Private (Patient/Caregiver)
 */
router.post(
  '/refresh-url/:memoryId',
  protect,
  async (req, res) => {
    try {
      const { memoryId } = req.params;
      const { daysValid = 7 } = req.body;

      // Find memory
      const memory = await FamilyMemory.findById(memoryId);
      if (!memory) {
        return res.status(404).json({ success: false, message: 'Memory not found' });
      }

      if (!memory.photo) {
        return res.status(404).json({ success: false, message: 'No photo for this memory' });
      }

      // Get new signed URL
      const result = await getSignedUrl(memory.photo, daysValid);

      res.json({
        success: result.success,
        url: result.url || null,
        message: result.error || 'URL refreshed'
      });
    } catch (error) {
      console.error('Refresh URL error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
