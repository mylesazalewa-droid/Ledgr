import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Scan, Loader, Zap,
         Cpu, Home, Shirt, Wrench, Star, Bike, Box } from 'lucide-react';
import { useApp } from '../../App.jsx';
import PhotoUpload from '../shared/PhotoUpload.jsx';
import PriceInput from '../shared/PriceInput.jsx';
import BarcodeScanner from '../shared/BarcodeScanner.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { storage } from '../../services/storage.js';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const ICON_MAP   = { Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box };
const STEPS      = ['Photo', 'Category', 'Details', 'Extras'];
const LOCATIONS  = ['Living Room', 'Family Room', 'Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Master Closet', 'Kitchen', 'Garage', 'Basement', 'Attic', 'Office', 'Storage'];

export default function AddItemModal({ onClose, initialQuickMode = false }) {
  const { addItem, categories } = useApp();
  const isMobile = useIsMobile();
  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const savingRef = useRef(false); // synchronous guard — useState is async and won't block double-taps

  const [showScanner,  setShowScanner]  = useState(false);
  const [scanLookup,   setScanLookup]   = useState(false);
  const [quickMode,    setQuickMode]    = useState(initialQuickMode);
  const [photoPath,    setPhotoPath]    = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [categoryId,   setCategoryId]  = useState(null);
  const [name,         setName]        = useState('');
  const [make,         setMake]        = useState('');
  const [model,        setModel]       = useState('');
  const [condition,    setCondition]   = useState('Good');
  const [costPrice,    setCostPrice]   = useState(0);
  const [estValue,     setEstValue]    = useState(0);
  const [askingPrice,  setAskingPrice] = useState(0);
  const [quantity,     setQuantity]    = useState(1);
  const [location,     setLocation]    = useState('');
  const [notes,        setNotes]       = useState('');
  const [listingUrl,   setListingUrl]  = useState('');

  async function handlePhotoSelected(path) {
    setPhotoPath(path);
    const url = await storage.getPhotoDataUrl(path) || path;
    setPhotoDataUrl(url);
  }

  async function handleBarcode(code) {
    setShowScanner(false);
    setScanLookup(true);
    try {
      const res  = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`);
      const data = await res.json();
      const found = data.items?.[0];
      if (found) {
        if (found.title) setName(found.title);
        if (found.brand) setMake(found.brand);
        if (found.model) setModel(found.model || '');
        setStep(2);
      }
    } catch {
      // silently ignore
    } finally {
      setScanLookup(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await addItem({
        name:         name.trim(),
        make:         make.trim()  || null,
        model:        model.trim() || null,
        category_id:  categoryId,
        condition,
        cost_price:   costPrice,
        est_value:    estValue,
        asking_price: askingPrice,
        quantity:     quantity > 1 ? quantity : null,
        notes:        notes.trim() || null,
        listing_url:  listingUrl.trim() || null,
        location:     location.trim() || null,
        photo_path:   photoPath,
      });
      onClose();
    } catch (err) {
      console.error('AddItemModal save failed:', err);
      setSaveError('Save failed — check your connection and try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const canAdvance = step === 2 ? name.trim().length > 0 : true;

  // ─── Step content rendered as a plain function call (NOT a component) ───────
  // IMPORTANT: do NOT turn this into <StepContent /> — defining a component
  // inside another component creates a new function reference on every render,
  // forcing React to fully unmount + remount it every time any state changes.
  // On iOS, if the step content remounts between touchstart and touchend, the
  // button element is replaced mid-gesture and iOS drops the click event.
  function renderStep() {
    if (step === 0 && !quickMode) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PhotoUpload photoPath={photoPath} photoDataUrl={photoDataUrl} onPhotoSelected={handlePhotoSelected} />
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
          Photo is optional — you can add one later.
        </p>
        <Divider label="shortcuts" />
        <button onClick={() => setShowScanner(true)} disabled={scanLookup} style={shortcutBtn}>
          {scanLookup
            ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Looking up barcode…</>
            : <><Scan size={14} /> Scan Barcode to auto-fill details</>
          }
        </button>
        <button onClick={() => setQuickMode(true)} style={{ ...shortcutBtn, color: 'var(--accent-gold)', borderColor: 'var(--border-accent)' }}>
          <Zap size={14} /> Quick Save — name &amp; price only
        </button>
      </div>
    );

    if (step === 0 && quickMode) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
          Capture it fast — fill in details later from the item drawer.
        </div>
        <InputField label="Item Name *" value={name} onChange={setName} placeholder="e.g. Sony headphones" autoFocus />
        <PriceInput label="Asking Price" value={askingPrice} onChange={setAskingPrice} />
        {saveError && <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>{saveError}</div>}
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{ ...saveBtn, opacity: (!name.trim() || saving) ? 0.5 : 1, cursor: (!name.trim() || saving) ? 'not-allowed' : 'pointer', marginTop: 4 }}
        >
          {saving ? 'Saving…' : <><Zap size={14} /> Quick Save</>}
        </button>
        <button onClick={() => setQuickMode(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>
          Fill in all details instead →
        </button>
      </div>
    );

    if (step === 1) return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {categories.map(cat => {
          const Icon = ICON_MAP[cat.icon] || Box;
          const sel  = categoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryId(sel ? null : cat.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                padding: '14px 8px', borderRadius: 12,
                border: `1px solid ${sel ? cat.color : 'var(--border-subtle)'}`,
                background: sel ? `${cat.color}18` : 'var(--bg-elevated)',
                cursor: 'pointer',
              }}
            >
              <Icon size={20} color={cat.color} />
              <span style={{ fontSize: 10, color: sel ? cat.color : 'var(--text-secondary)', fontWeight: sel ? 600 : 400 }}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    );

    if (step === 2) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <InputField label="Item Name *" value={name} onChange={setName} placeholder="e.g. Sony WH-1000XM5" autoFocus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField label="Make / Brand" value={make}  onChange={setMake}  placeholder="e.g. Sony" />
          <InputField label="Model"        value={model} onChange={setModel} placeholder="e.g. WH-1000XM5" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Condition</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CONDITIONS.map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{
                padding: '5px 12px', borderRadius: 20,
                border: `1px solid ${condition === c ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
                background: condition === c ? 'rgba(212,168,83,0.12)' : 'var(--bg-elevated)',
                color: condition === c ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', fontWeight: condition === c ? 600 : 400,
              }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Quantity</label>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, width: 'fit-content', overflow: 'hidden' }}>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ padding: '7px 14px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>−</button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', minWidth: 28, textAlign: 'center' }}>{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} style={{ padding: '7px 14px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>+</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <PriceInput label="Cost Paid"    value={costPrice}   onChange={setCostPrice}   />
          <PriceInput label="Est. Value"   value={estValue}    onChange={setEstValue}    />
          <PriceInput label="Asking Price" value={askingPrice} onChange={setAskingPrice} />
        </div>
      </div>
    );

    if (step === 3) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Location in home</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Garage, Closet…"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LOCATIONS.map(l => (
              <button key={l} onClick={() => setLocation(l)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${location === l ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
                background: location === l ? 'rgba(212,168,83,0.12)' : 'var(--bg-elevated)',
                color: location === l ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontWeight: location === l ? 600 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Describe condition, what's included, any flaws…" style={textareaStyle} />
        </div>
        <InputField label="Listing URL (optional)" value={listingUrl} onChange={setListingUrl} placeholder="https://…" />
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Summary</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{name || '—'}</div>
          {(make || model) && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{[make, model].filter(Boolean).join(' ')}</div>}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'center' }}>
            {costPrice > 0 && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Cost ${costPrice.toFixed(2)}</span>}
            {askingPrice > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-gold)', fontWeight: 600 }}>${askingPrice.toFixed(2)}</span>}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{condition}</span>
            {costPrice > 0 && askingPrice > 0 && <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>+${(askingPrice - costPrice).toFixed(2)} margin</span>}
          </div>
        </div>
        {saveError && <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>{saveError}</div>}
      </div>
    );

    return null;
  }

  // ─── Shared inner layout ──────────────────────────────────────────────────
  const innerContent = (
    <>
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Add Item</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={18} color="var(--text-secondary)" />
        </button>
      </div>

      {/* Progress */}
      <div style={{ padding: '10px 22px 0', display: 'flex', gap: 6, flexShrink: 0 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--accent-gold)' : 'var(--border-subtle)', transition: 'background 200ms' }} />
        ))}
      </div>

      {/* Content — renderStep() is a plain function call, NOT a component mount */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
        {isMobile
          ? renderStep()
          : (
            <AnimatePresence mode="wait">
              <motion.div key={`${step}-${quickMode}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          )
        }
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 22px',
        paddingBottom: isMobile ? 'calc(14px + env(safe-area-inset-bottom))' : '14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        {step > 0
          ? <button onClick={() => setStep(s => s - 1)} style={backBtn}><ChevronLeft size={15} /> Back</button>
          : <div />
        }
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance}
            style={{ ...nextBtn, opacity: canAdvance ? 1 : 0.4, cursor: canAdvance ? 'pointer' : 'not-allowed' }}>
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={handleSave} disabled={!name.trim() || saving}
            style={{ ...saveBtn, opacity: (!name.trim() || saving) ? 0.5 : 1, cursor: (!name.trim() || saving) ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : <><Check size={14} /> Add to Ledgr</>}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        /*
         * MOBILE — no Framer Motion anywhere in this tree.
         *
         * Every previous attempt used motion.div with opacity or y animations.
         * After the animation, Framer Motion keeps inline styles (opacity:1,
         * transform:translateY(0px), will-change:...) that trigger iOS GPU
         * compositing layers. On iOS Safari, compositing layers cause touch
         * hit-test coordinates to be miscalculated, making buttons silently
         * unresponsive. Removing ALL Framer Motion from the mobile path and
         * using plain CSS animations is the only reliable fix.
         */
        <div
          className="modal-mobile-overlay"
          style={{
            position: 'fixed', inset: 0,
            zIndex: 300,
            background: 'var(--bg-surface)',
          }}
        >
          <div
            className="modal-mobile-enter"
            style={{
              width: '100%',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: 'env(safe-area-inset-top)',
            }}
          >
            {innerContent}
          </div>
        </div>
      ) : (
        /*
         * DESKTOP — Framer Motion is safe here (no iOS touch issues on desktop).
         */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.target === e.currentTarget && onClose()}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300,
            backdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{ scale: 0.92,    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-modal)',
              width: 480,
              maxHeight: '85vh',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-float)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {innerContent}
          </motion.div>
        </motion.div>
      )}

      {showScanner && (
        <BarcodeScanner
          onResult={handleBarcode}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}

function InputField({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }}
      />
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  );
}

const labelStyle    = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' };
const textareaStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', width: '100%' };
const backBtn  = { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' };
const nextBtn  = { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 };
const saveBtn  = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent-gold)', color: '#0a0a0b', fontSize: 13, fontWeight: 700 };
const shortcutBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', width: '100%' };
