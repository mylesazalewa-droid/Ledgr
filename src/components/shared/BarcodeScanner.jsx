import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// All common retail barcode formats
const FORMATS = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93', 'itf', 'qr_code',
];

export default function BarcodeScanner({ onResult, onClose }) {
  const [error,   setError]   = useState(null);
  const [useNative, setUseNative] = useState(null); // true = BarcodeDetector, false = html5-qrcode
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const doneRef    = useRef(false);
  const html5Ref   = useRef(null);

  useEffect(() => {
    const native = 'BarcodeDetector' in window;
    setUseNative(native);
    if (native) startNative();
    else        startHtml5();

    return () => {
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Stop native stream
      streamRef.current?.getTracks?.().forEach(t => t.stop());
      // Stop html5-qrcode scanner
      html5Ref.current?.stop().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Native BarcodeDetector (Chrome, Safari 17+, most modern browsers) ──
  async function startNative() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      if (doneRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scheduleDetect();
      }
    } catch (err) {
      setError('Camera access denied — ' + err.message);
    }
  }

  function scheduleDetect() {
    const detector = new window.BarcodeDetector({ formats: FORMATS });
    function tick() {
      if (doneRef.current || !videoRef.current) return;
      detector.detect(videoRef.current).then(results => {
        if (doneRef.current) return;
        if (results.length > 0) {
          doneRef.current = true;
          onResult(results[0].rawValue);
        } else {
          rafRef.current = requestAnimationFrame(tick);
        }
      }).catch(() => {
        if (!doneRef.current) rafRef.current = requestAnimationFrame(tick);
      });
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  // ── html5-qrcode fallback (older browsers / Firefox) ──
  async function startHtml5() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (doneRef.current) return;
      const scanner = new Html5Qrcode('_qr_box');
      html5Ref.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 280, height: 160 }, aspectRatio: 1.777 },
        (code) => {
          if (doneRef.current) return;
          doneRef.current = true;
          scanner.stop().catch(() => {});
          onResult(code);
        },
        () => {} // ignore per-frame decode errors
      );
    } catch (err) {
      setError('Camera not available — ' + err.message);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: '14px 18px',
        paddingTop: 'calc(14px + env(safe-area-inset-top))',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
      }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>
          Scan Barcode
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none', borderRadius: '50%',
            width: 34, height: 34, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} color="#fff" />
        </button>
      </div>

      {error ? (
        // Error state
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32,
        }}>
          <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
            {error}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '9px 22px', borderRadius: 9,
              background: 'rgba(255,255,255,0.1)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      ) : useNative ? (
        // Native BarcodeDetector — our own fullscreen video
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Viewfinder overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 290, height: 165,
              border: '2.5px solid rgba(212,168,83,0.95)',
              borderRadius: 14,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
            }} />
            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 22,
              textAlign: 'center',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
              Align barcode within the frame
            </p>
          </div>
        </>
      ) : (
        // html5-qrcode fallback — it renders its own camera UI
        <div
          id="_qr_box"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      )}
    </motion.div>
  );
}
