const admin = require('../config/firebaseAdmin');
const path = require('path');
const sharp = require('sharp');

// Lazy-load bucket to handle Firebase initialization issues
let bucket = null;

const getBucket = () => {
  if (!bucket) {
    try {
      bucket = admin.storage().bucket();
    } catch (error) {
      console.warn('Firebase Storage not available:', error.message);
      return null;
    }
  }
  return bucket;
};

/**
 * Upload and optimize image to Firebase Storage
 */
const uploadAndOptimizeImage = async (imageBuffer, filename, folder = 'memories') => {
  try {
    const firBucket = getBucket();
    if (!firBucket) {
      return { success: false, error: 'Firebase Storage not configured' };
    }

    const timestamp = Date.now();
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const uniqueName = `${name}-${timestamp}${ext}`;
    const filePath = `${folder}/${uniqueName}`;

    const optimized = await sharp(imageBuffer)
      .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    const thumbnail = await sharp(imageBuffer)
      .resize(300, 200, { fit: 'cover' })
      .jpeg({ quality: 60 })
      .toBuffer();

    const file = firBucket.file(filePath);
    await file.save(optimized, {
      metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' }
    });

    const thumbPath = `${folder}/thumbs/${uniqueName}`;
    const thumbFile = firBucket.file(thumbPath);
    await thumbFile.save(thumbnail, {
      metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' }
    });

    const [mainUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    const [thumbUrl] = await thumbFile.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    return {
      success: true,
      filePath,
      thumbPath,
      filename: uniqueName,
      mainUrl,
      thumbUrl,
      size: optimized.length,
      thumbnailSize: thumbnail.length
    };
  } catch (error) {
    console.error('Error uploading and optimizing image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload image from base64 string
 */
const uploadBase64Image = async (base64String, filename, folder = 'memories') => {
  try {
    const imageBuffer = Buffer.from(base64String, 'base64');
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return { success: false, error: 'Image too large (max 10MB)' };
    }
    return await uploadAndOptimizeImage(imageBuffer, filename, folder);
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete image and thumbnail from storage
 */
const deleteImage = async (filePath) => {
  try {
    const firBucket = getBucket();
    if (!firBucket) {
      return { success: false, error: 'Firebase Storage not configured' };
    }

    const file = firBucket.file(filePath);
    const thumbPath = filePath.replace(/(.*\/)/, '$1thumbs/');
    const thumbFile = firBucket.file(thumbPath);

    await Promise.all([
      file.delete().catch(() => {}),
      thumbFile.delete().catch(() => {})
    ]);

    return { success: true, message: 'Image deleted' };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get signed URL for image
 */
const getSignedUrl = async (filePath, expirationDays = 7) => {
  try {
    const firBucket = getBucket();
    if (!firBucket) {
      return { success: false, error: 'Firebase Storage not configured' };
    }

    const file = firBucket.file(filePath);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expirationDays * 24 * 60 * 60 * 1000
    });

    return { success: true, url: signedUrl };
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Batch delete images
 */
const batchDeleteImages = async (filePaths) => {
  try {
    const firBucket = getBucket();
    if (!firBucket) {
      return { success: false, error: 'Firebase Storage not configured' };
    }

    const results = { deleted: 0, failed: 0, errors: [] };

    for (const filePath of filePaths) {
      try {
        const file = firBucket.file(filePath);
        await file.delete();
        results.deleted++;
      } catch (error) {
        results.failed++;
        results.errors.push({ filePath, error: error.message });
      }
    }

    return { success: results.failed === 0, results };
  } catch (error) {
    console.error('Error batch deleting images:', error);
    return { success: false, error: error.message };
  }
};

/**
 * List files in a folder
 */
const listImages = async (folder = 'memories', maxResults = 100) => {
  try {
    const firBucket = getBucket();
    if (!firBucket) {
      return { success: false, error: 'Firebase Storage not configured' };
    }

    const [files] = await firBucket.getFiles({ prefix: folder, maxResults });

    const images = files
      .filter(f => !f.name.includes('/thumbs/'))
      .map(f => ({
        name: f.name,
        size: f.metadata.size,
        created: f.metadata.timeCreated,
        updated: f.metadata.updated
      }));

    return { success: true, count: images.length, images };
  } catch (error) {
    console.error('Error listing images:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Make image public
 */
const makeImagePublic = async (filePath) => {
  try {
    const firBucket = getBucket();
    if (!firBucket) {
      return { success: false, error: 'Firebase Storage not configured' };
    }

    const file = firBucket.file(filePath);
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${firBucket.name}/${filePath}`;
    
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error making image public:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get image metadata
 */
const getImageMetadata = async (filePath) => {
  try {
    const firBucket = getBucket();
    if (!firBucket) {
      return { success: false, error: 'Firebase Storage not configured' };
    }

    const file = firBucket.file(filePath);
    const [metadata] = await file.getMetadata();
    
    return { 
      success: true, 
      metadata: {
        size: metadata.size,
        contentType: metadata.contentType,
        created: metadata.timeCreated,
        updated: metadata.updated,
        md5: metadata.md5Hash
      }
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  uploadAndOptimizeImage,
  uploadBase64Image,
  deleteImage,
  getSignedUrl,
  batchDeleteImages,
  listImages,
  makeImagePublic,
  getImageMetadata
};
