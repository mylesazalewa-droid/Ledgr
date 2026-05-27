import { useState, useCallback } from 'react';
import { Image, Upload } from 'lucide-react';

export default function PhotoUpload({ photoPath, photoDataUrl, onPhotoSelected, size = 'normal' }) {
  const [dragging, setDragging] = useState(false);

  const handleClick = async () => {
    const filePath = await window.stash.openPhotoDialog();
    if (!filePath) return;
    const copiedPath = await window.stash.copyPhotoToAppData(filePath);
    onPhotoSelected(copiedPath);
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const filePath = file.path; // Electron provides .path on File objects
    if (!filePath) return;
    const copiedPath = await window.stash.copyPhotoToAppData(filePath);
    onPhotoSelected(copiedPath);
  }, [onPhotoSelected]);

  const isSmall = size === 'small';

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      style={{
        width: '100%',
        aspectRatio: isSmall ? '16/9' : '4/3',
        borderRadius: 10,
        border: `2px dashed ${dragging ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
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
      {photoDataUrl ? (
        <img
          src={photoDataUrl}
          alt="Item photo"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {dragging
            ? <Upload size={24} color="var(--accent-gold)" />
            : <Image  size={24} color="var(--text-tertiary)" />
          }
          <span style={{ fontSize: 12, color: dragging ? 'var(--accent-gold)' : 'var(--text-tertiary)' }}>
            {dragging ? 'Drop to add' : 'Click or drop photo'}
          </span>
        </div>
      )}
    </div>
  );
}
