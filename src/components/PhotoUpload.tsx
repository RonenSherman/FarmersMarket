'use client';

import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PhotoUploadProps {
  onPhotoSelected: (file: File) => void;
  currentImageUrl?: string;
  className?: string;
}

export default function PhotoUpload({ onPhotoSelected, currentImageUrl, className = '' }: PhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Call the parent callback
    onPhotoSelected(file);
    
    setIsUploading(false);
    toast.success('Photo selected successfully');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearPhoto = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openCameraDialog = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview Area */}
      <div className="relative">
        {previewUrl ? (
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Product preview"
              className="w-full h-48 object-cover rounded-lg border-2 border-earth-200"
            />
            <button
              onClick={clearPhoto}
              className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium">Click X to remove</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-48 border-2 border-dashed border-earth-300 rounded-lg flex items-center justify-center bg-earth-50">
            <div className="text-center">
              <PhotoIcon className="h-12 w-12 text-earth-400 mx-auto mb-2" />
              <p className="text-earth-600 text-sm">No photo selected</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* File Upload Button */}
        <button
          type="button"
          onClick={openFileDialog}
          disabled={isUploading}
          className="flex items-center justify-center space-x-2 bg-market-600 text-white py-3 px-4 rounded-lg hover:bg-market-700 transition-colors disabled:opacity-50"
        >
          <PhotoIcon className="h-5 w-5" />
          <span>Choose Photo</span>
        </button>

        {/* Camera Capture Button (Mobile) */}
        <button
          type="button"
          onClick={openCameraDialog}
          disabled={isUploading}
          className="flex items-center justify-center space-x-2 bg-earth-600 text-white py-3 px-4 rounded-lg hover:bg-earth-700 transition-colors disabled:opacity-50"
        >
          <CameraIcon className="h-5 w-5" />
          <span>Take Photo</span>
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Upload Instructions */}
      <div className="text-xs text-earth-500 space-y-1">
        <p>• Choose Photo: Select from your device gallery</p>
        <p>• Take Photo: Use camera to capture new image (mobile)</p>
        <p>• Maximum file size: 5MB</p>
        <p>• Supported formats: JPG, PNG, WebP</p>
      </div>
    </div>
  );
} 