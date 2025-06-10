'use client';

import { useState, useRef } from 'react';
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface CameraUploadProps {
  onImageCapture: (imageFile: File) => void;
  existingImage?: string;
  className?: string;
  accept?: string;
}

export default function CameraUpload({ 
  onImageCapture, 
  existingImage, 
  className = "",
  accept = "image/*"
}: CameraUploadProps) {
  const [preview, setPreview] = useState<string | null>(existingImage || null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }

    setIsLoading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Process image for upload
      const processedFile = await processImage(file);
      onImageCapture(processedFile);
      
      toast.success('📸 Image captured successfully!');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const processImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      img.onload = () => {
        // Calculate dimensions for resize (max 800px width/height)
        const maxSize = 800;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(processedFile);
            } else {
              reject(new Error('Failed to process image'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const removeImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {preview ? (
        // Image Preview
        <div className="relative">
          <img 
            src={preview} 
            alt="Product preview" 
            className="w-full h-48 sm:h-64 object-cover rounded-lg border-2 border-earth-200"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      ) : (
        // Upload Options
        <div className="space-y-3">
          <div className="border-2 border-dashed border-earth-300 rounded-lg p-6 text-center bg-earth-50">
            <PhotoIcon className="h-12 w-12 text-earth-400 mx-auto mb-3" />
            <p className="text-sm text-earth-600 mb-4">Add a photo of your product</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={openCamera}
                disabled={isLoading}
                className="btn-secondary flex items-center justify-center space-x-2 px-4 py-2"
              >
                <CameraIcon className="h-4 w-4" />
                <span>📸 Take Photo</span>
              </button>
              
              <button
                type="button"
                onClick={openGallery}
                disabled={isLoading}
                className="btn-outline flex items-center justify-center space-x-2 px-4 py-2"
              >
                <PhotoIcon className="h-4 w-4" />
                <span>📁 Choose from Gallery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {isLoading && (
        <div className="text-center text-sm text-earth-600">
          <div className="animate-pulse">Processing image...</div>
        </div>
      )}
    </div>
  );
} 