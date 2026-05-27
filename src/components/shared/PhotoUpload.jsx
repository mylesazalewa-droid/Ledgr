import { useState, useRef, useCallback } from 'react';
import { Image, Upload, Camera, Loader, AlertCircle } from 'lucide-react';
import { storage, isElectron } from '../../services/storage.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

// Resize + compress any image to JPEG before uploading.
// Fixes iOS HEIC compatibility issues and keeps file sizes small.
function compressImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1200;
      const scale = img.width > MAX ? MAX / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.78);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function PhotoUpload({ photoPath, photoDataUrl, onPhotoSelected, size = 'normal' }) {
  const [dragging,   setDragging]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState(null);
  const [preview,    setPreview]    = useState(null); // local blob URL while uploading
  const fileInputRef = useRef(null);
  const isMobile = useIsMobile();

  // ---- Electron: native file dialog ----
  const handleElectronClick = async () => {
    const filePath = await window.stash.openPhotoDialog();
    if (!filePath) return;
    const copiedPath = await window.stash.copyPhotoToAppData(filePath);
    onPhotoSelected(copiedPath);
  };

  // ---- Web: file input ----
  const handleWebClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);

    // Show local preview instantly
    const blobUrl = URL.createObjectURL(file);
    setPreview(blobUrl);
    setUploading(true);

    try {
      const compressed = await compressImage(file);
      const savedPath  = await storage.copyPhotoToAppData(compressed);
      onPhotoSelected(savedPath);
      URL.revokeObjectURL(blobUrl);
      setPreview(null);
    } catch (err) {
      console.error('Photo upload failed:', err);
      setUploadErr('Upload failed — tap to retry');
      setPreview(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ---- Drag and drop (desktop web / Electron) ----
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (isElectron) {
      const filePath = file.path;
      if (!filePath) return;
      const copiedPath = await window.stash.copyPhotoToAppData(filePath);
      onPhotoSelected(copiedPath);
    } else {
      const blobUrl = URL.createObjectURL(file);
      setPreview(blobUrl);
      setUploading(true);
      try {
        const compressed = await compressImage(file);
        const savedPath  = await storage.copyPhotoToAppData(compressed);
        onPhotoSelected(savedPath);
        URL.revokeObjectURL(blobUrl);
        setPreview(null);
      } catch (err) {
        console.error('Photo upload failed:', err);
        setUploadErr('Upload failed — tap to retry');
        setPreview(null);
      } finally {
        setUploading(false);
      }
    }
  }, [onPhotoSelected]);

  const displayUrl = preview || photoDataUrl;
  const isSmall    = size === 'small';

  return (
    <>
      {/* Hidden file input — accept="image/*" triggers camera sheet on iOS/Android */}
      {!isElectron && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      )}

      <div
        onClick={isElectron ? handleElectronClick : handleWebClick}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        style={{
          width: '100%',
          aspectRatio: isSmall ? '16/9' : '4/3',
          borderRadius: 10,
          border: `2px dashed ${dragging ? 'var(--accent-gold)' : displayUrl ? 'transparent' : 'var(--border-subtle)'}`,
          background: dragging ? 'rgba(212,168,83,0.06)' : 'var(--bg-surface)',
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 150ms ease',
          position: 'relative',
        }}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Item photo"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                position: 'absolute', inset: 0,
                opacity: uploading ? 0.5 : 1,
                transition: 'opacity 200ms',
              }}
            />
            {uploading && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)',
              }}>
                <Loader size={22} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16, textAlign: 'center' }}>
            {uploading ? (
              <>
                <Loader size={24} color="var(--accent-gold)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Uploading…</span>
              </>
            ) : uploadErr ? (
              <>
                <AlertCircle size={24} color="var(--accent-red)" />
                <span style={{ fontSize: 12, color: 'var(--accent-red)' }}>{uploadErr}</span>
              </>
            ) : dragging ? (
              <>
                <Upload size={24} color="var(--accent-gold)" />
                <span style={{ fontSize: 12, color: 'var(--accent-gold)' }}>Drop to add</span>
              </>
            ) : isMobile ? (
              <>
                <Camera size={24} color="var(--text-tertiary)" />
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Tap to take photo or choose from library</span>
              </>
            ) : (
              <>
                <Image size={24} color="var(--text-tertiary)" />
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Click or drop a photo</span>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
