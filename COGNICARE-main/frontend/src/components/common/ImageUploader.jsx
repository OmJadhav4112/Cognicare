import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  uploadImageFile,
  compressImage,
  createThumbnail,
  validateImageFile,
  getImageDimensions
} from '../../services/storageService';
import Spinner from './Spinner';
import Toast from './Toast';

export default function ImageUploader({ onUploadSuccess, onUploadError, maxSizeMB = 10 }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [toast, setToast] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file
    const validation = validateImageFile(file, maxSizeMB);
    if (!validation.valid) {
      setToast({ type: 'error', message: validation.error });
      onUploadError?.(validation.error);
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(10);

      // Get image dimensions
      const dims = await getImageDimensions(file);
      setDimensions(dims);
      setUploadProgress(30);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setUploadProgress(50);

      // Create thumbnail
      const thumb = await createThumbnail(file, 200);
      setThumbnail(thumb);
      setUploadProgress(70);

      // Compress before upload
      const compressedFile = await compressImage(file, 1200, 800, 0.8);
      setUploadProgress(85);

      // Upload to backend
      const result = await uploadImageFile(compressedFile);

      if (result.success) {
        setUploadProgress(100);
        setToast({ type: 'success', message: 'Image uploaded successfully' });
        onUploadSuccess?.(result.data);

        // Reset after 2 seconds
        setTimeout(() => {
          setPreview(null);
          setThumbnail(null);
          setDimensions(null);
          setUploadProgress(0);
        }, 2000);
      } else {
        setToast({ type: 'error', message: result.message || 'Upload failed' });
        onUploadError?.(result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setToast({ type: 'error', message: error.message });
      onUploadError?.(error.message);
    } finally {
      setLoading(false);
    }
  }, [maxSizeMB, onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    disabled: loading,
    multiple: false
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{uploadProgress}% Uploading...</p>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            {dimensions && (
              <p className="text-sm text-gray-600">
                📐 {dimensions.width} × {dimensions.height}px
              </p>
            )}
            {thumbnail && (
              <div>
                <p className="text-xs text-gray-600 mb-2">Thumbnail:</p>
                <img src={thumbnail} alt="Thumbnail" className="w-20 h-20 rounded" />
              </div>
            )}
          </div>
        ) : isDragActive ? (
          <div className="py-6">
            <p className="text-lg font-semibold text-blue-500">📸 Drop image here</p>
            <p className="text-sm text-gray-600 mt-2">
              JPEG, PNG, or WebP (max {maxSizeMB}MB)
            </p>
          </div>
        ) : (
          <div className="py-6">
            <p className="text-lg font-semibold text-gray-700">📤 Upload Memory Photo</p>
            <p className="text-sm text-gray-600 mt-2">
              Drag and drop or click to select
            </p>
            <p className="text-xs text-gray-500 mt-2">
              JPEG, PNG, or WebP • Max {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
