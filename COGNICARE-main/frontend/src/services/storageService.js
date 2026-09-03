import api from './api';

/**
 * Upload image file (multipart form)
 */
export const uploadImageFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('photo', file);

    const result = await api.post('/storage/upload-memory', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return result.data;
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Upload image from base64 string
 */
export const uploadBase64Image = async (base64Data, filename) => {
  try {
    const result = await api.post('/storage/upload-base64', {
      base64: base64Data,
      filename
    });

    return result.data;
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Delete memory photo
 */
export const deleteMemoryPhoto = async (memoryId) => {
  try {
    const result = await api.delete(`/storage/image/${memoryId}`);
    return result.data;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Get image metadata
 */
export const getImageMetadata = async (memoryId) => {
  try {
    const result = await api.get(`/storage/image-metadata/${memoryId}`);
    return result.data;
  } catch (error) {
    console.error('Error fetching image metadata:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Refresh signed URL for image
 */
export const refreshImageUrl = async (memoryId, daysValid = 7) => {
  try {
    const result = await api.post(`/storage/refresh-url/${memoryId}`, {
      daysValid
    });

    return result.data;
  } catch (error) {
    console.error('Error refreshing image URL:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Convert file to base64
 */
export const fileToBase64 = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

/**
 * Validate image file
 */
export const validateImageFile = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedFormats.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP formats are supported' };
  }

  return { valid: true };
};

/**
 * Get image dimensions
 */
export const getImageDimensions = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Unable to load image'));
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error('Unable to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image client-side (before upload)
 */
export const compressImage = async (file, maxWidth = 1200, maxHeight = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
    };
  });
};

/**
 * Create thumbnail for preview
 */
export const createThumbnail = async (file, size = 200) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const xOffset = (img.width - img.height) / 2;
        ctx.drawImage(img, xOffset, 0, img.height, img.height, 0, 0, size, size);

        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};
