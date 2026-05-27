import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onResult, onClose }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let scanner = null;

    async function init() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            onResult(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {} // ignore scan errors
        );
      } catch (err) {
        setError('Camera not available. ' + err.message);
      }
    }

    init();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onResult]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 18,
          padding: 24,
          width: 380,
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Scan Barcode</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {error ? (
          <div style={{ color: 'var(--accent-red)', fontSize: 13, textAlign: 'center', padding: 20 }}>{error}</div>
        ) : (
          <div id="qr-reader" style={{ borderRadius: 10, overflow: 'hidden' }} />
        )}
      </motion.div>
    </motion.div>
  );
}
