import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// Formats for the native BarcodeDetector API
const NATIVE_FORMATS = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93', 'itf', 'qr_code',
];

export default function BarcodeScanner({ onResult, onClose }) {
  const [error,     setError]     = useState(null);
  const [useNative, setUseNative] = useState(null);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const doneRef   = useRef(false);
  const html5Ref  = useRef(null);

  useEffect(() => {
    start();
    return () => {
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks?.().forEach(t => t.stop());
      html5Ref.current?.stop().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    // Try native BarcodeDetector first (Chrome desktop, Samsung Browser, some iOS 17+)
    if ('BarcodeDetector' in window) {
      try {
        // getSupportedFormats lets us filter to only what the browser supports
        const supported = (await window.BarcodeDetector.getSupportedFormats?.()) ?? [];
        const formats   = supported.length > 0
          ? NATIVE_FORMATS.filter(f => supported.includes(f))
          : NATIVE_FORMATS;

        // Verify the constructor works — some browsers claim support but throw
        const testDetector = new window.BarcodeDetector({ formats: formats.length > 0 ? formats : ['qr_code'] });
        if (testDetector) {
          setUseNative(true);
          await startNative(formats.length > 0 ? formats : NATIVE_FORMATS);
          return;
        }
      } catch {
        // BarcodeDetector constructor failed — fall through to html5-qrcode
      }
    }
    setUseNative(false);
    await startHtml5();
  }

  // ── Native BarcodeDetector ────────────────────────────────────────────────
  async function startNative(formats) {
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
        scheduleDetect(formats);
      }
    } catch (err) {
      setError('Camera access denied — ' + err.message);
    }
  }

  function scheduleDetect(formats) {
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats });
    } catch {
      // Fall back to html5-qrcode if detector creation fails mid-stream
      setUseNative(false);
      streamRef.current?.getTracks?.().forEach(t => t.stop());
      startHtml5();
      return;
    }

    function tick() {
      if (doneRef.current || !videoRef.current) return;
      detector.detect(videoRef.current)
        .then(results => {
          if (doneRef.current) return;
          if (results.length > 0) {
            doneRef.current = true;
            onResult(results[0].rawValue);
          } else {
            rafRef.current = requestAnimationFrame(tick);
          }
        })
        .catch(() => {
          if (!doneRef.current) rafRef.current = requestAnimationFrame(tick);
        });
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  // ── html5-qrcode fallback (iOS Safari, Firefox, older browsers) ───────────
  // IMPORTANT: Must pass formatsToSupport — default is QR-code only.
  async function startHtml5() {
    try {
      const lib = await import('html5-qrcode');
      if (doneRef.current) return;

      const { Html5Qrcode, Html5QrcodeSupportedFormats: SF } = lib;

      // Build the formats list from the enum (handles missing enum gracefully)
      const formatsToSupport = [];
      if (SF) {
        [
          SF.EAN_13, SF.EAN_8,
          SF.UPC_A,  SF.UPC_E,
          SF.CODE_128, SF.CODE_39, SF.CODE_93,
          SF.ITF, SF.QR_CODE,
        ].forEach(f => f !== undefined && formatsToSupport.push(f));
      }

      const scanner = new Html5Qrcode(
        '_qr_box',
        formatsToSupport.length > 0 ? { formatsToSupport, verbose: false } : { verbose: false },
      );
      html5Ref.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 260, height: 160 }, aspectRatio: 1.777 },
        (code) => {
          if (doneRef.current) return;
          doneRef.current = true;
          scanner.stop().catch(() => {});
          onResult(code);
        },
        () => {}, // ignore per-frame decode failures
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
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: '14px 18px',
        paddingTop: 'calc(14px + env(safe-area-inset-top))',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
      }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Scan Barcode</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: 34, height: 34, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} color="#fff" />
        </button>
      </div>

      {error ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
          <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>{error}</div>
          <button onClick={onClose} style={{ padding: '9px 22px', borderRadius: 9, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13 }}>
            Close
          </button>
        </div>
      ) : useNative !== false ? (
        // Native path — our own <video> + overlay
        <>
          <video
            ref={videoRef}
            muted playsInline autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 290, height: 165,
              border: '2.5px solid rgba(212,168,83,0.95)',
              borderRadius: 14,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 22, textAlign: 'center', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              Align barcode within the frame
            </p>
          </div>
        </>
      ) : (
        // html5-qrcode path — it renders its own camera UI inside this div
        <div
          id="_qr_box"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      )}
    </motion.div>
  );
}
