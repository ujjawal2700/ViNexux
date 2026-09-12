import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle2, Cloud } from 'lucide-react';
import uploadService from '../../services/uploadService';

/**
 * Reusable Cloudinary Image Uploader Component
 *
 * @param {Object} props
 * @param {string} props.value - Currently selected/uploaded image URL
 * @param {function} props.onChange - Callback function receiving (imageUrl, metadata)
 * @param {string} props.folder - Target Cloudinary folder (default: 'vinexus/products')
 * @param {string} props.label - Optional field label
 * @param {string} props.placeholder - Custom dropzone placeholder text
 * @param {boolean} props.disabled - Disable input
 */
export const ImageUploader = ({
  value = '',
  onChange,
  folder = 'vinexus/uploads',
  label = 'Image Upload (Cloudinary)',
  placeholder = 'Click or drag image file here to upload',
  disabled = false,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const res = await uploadService.uploadImage(file, folder);
      if (res.success && res.data?.url) {
        if (onChange) {
          onChange(res.data.url, res.data);
        }
      } else {
        setError(res.message || 'Failed to upload image to Cloudinary');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading image file');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    if (onChange) {
      onChange('', null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-primary" /> {label}
          </span>
          {value && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Image Ready
            </span>
          )}
        </label>
      )}

      {value ? (
        /* Preview Frame */
        <div className="relative group rounded-2xl border border-border overflow-hidden bg-muted/40 p-2 flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 relative border border-border/60">
            <img src={value} alt="Uploaded Cloudinary Preview" className="w-full h-full object-cover object-center" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-xs font-mono font-semibold text-foreground truncate">{value}</p>
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
              <Cloud className="w-3 h-3 text-primary" /> Cloudinary Hosted URL
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors"
            title="Remove Image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Upload Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/60'
          } ${disabled || uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs font-bold text-foreground">Uploading image to Cloudinary...</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{placeholder}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Supports PNG, JPG, WEBP, SVG up to 10MB</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-500 font-medium pt-1 flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
