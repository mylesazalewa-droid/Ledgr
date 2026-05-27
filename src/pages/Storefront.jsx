/**
 * Public Storefront — /shop/:userId
 * Renders a seller's available items to any visitor (no auth required).
 * Fetches from Firestore `storefronts/{userId}` (public collection).
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

export default function Storefront({ userId }) {
  const [storefront, setStorefront] = useState(null);   // { displayName, bio, contactInfo }
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);

  useEffect(() => {
    if (!userId) { setError('Storefront not found.'); setLoading(false); return; }
    loadStorefront();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStorefront() {
    try {
      // Fetch seller profile
      const profileSnap = await getDoc(doc(db, 'storefronts', userId));
      if (!profileSnap.exists() || !profileSnap.data().enabled) {
        setError('This storefront is not available.');
        setLoading(false);
        return;
      }
      setStorefront(profileSnap.data());

      // Fetch available items
      const itemsSnap = await getDocs(
        query(collection(db, 'storefronts', userId, 'items'), orderBy('added_at', 'desc'))
      );
      setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Storefront load error:', err);
      setError('Could not load storefront — please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--accent-gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{error}</div>
        </div>
      </div>
    );
  }

  const availableItems = items.filter(i => i.status === 'available' || !i.status);

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0b; color: #e8e8ea; }
        :root {
          --accent-gold: #d4a853;
          --accent-gold-dim: rgba(212,168,83,0.6);
          --accent-green: #4caf7d;
          --text-primary: #e8e8ea;
          --text-secondary: #9b9ba8;
          --text-tertiary: #5a5a6a;
          --bg-surface: #111115;
          --bg-elevated: #1a1a20;
          --border-subtle: rgba(255,255,255,0.07);
          --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 32 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '-0.01em' }}>
              {storefront.displayName || 'Stash Shop'}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#0a0a0b', background: 'var(--accent-gold)', borderRadius: 4, padding: '2px 7px',
            }}>
              {availableItems.length} items
            </span>
          </div>
          {storefront.bio && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{storefront.bio}</p>
          )}
          {storefront.contactInfo && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              Contact: <span style={{ color: 'var(--text-secondary)' }}>{storefront.contactInfo}</span>
            </p>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
            Powered by <span style={{ color: 'var(--accent-gold-dim)' }}>Stash</span>
          </div>
        </div>
      </div>

      {/* Item grid */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 60px' }}>
        {availableItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '60px 0', fontSize: 14 }}>
            No items available right now — check back soon!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {availableItems.map(item => (
              <StorefrontCard key={item.id} item={item} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Item detail overlay */}
      {selected && (
        <ItemOverlay item={selected} onClose={() => setSelected(null)} sellerContact={storefront.contactInfo} />
      )}
    </div>
  );
}

function StorefrontCard({ item, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'rgba(212,168,83,0.3)' : 'var(--border-subtle)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 150ms, transform 150ms, box-shadow 150ms',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Photo */}
      <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        {item.photo_url || item.photo_path ? (
          <img
            src={item.photo_url || item.photo_path}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 250ms', transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>📦</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        {(item.make || item.model) && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[item.make, item.model].filter(Boolean).join(' ')}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent-gold)' }}>
            {item.asking_price > 0 ? fmt(item.asking_price) : 'Make offer'}
          </span>
          {item.condition && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', borderRadius: 5, padding: '2px 7px' }}>
              {item.condition}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemOverlay({ item, onClose, sellerContact }) {
  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function shareItem() {
    const text = [
      item.name,
      [item.make, item.model].filter(Boolean).join(' '),
      item.condition ? `Condition: ${item.condition}` : null,
      item.asking_price ? `Price: ${fmt(item.asking_price)}` : null,
      item.notes || null,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      navigator.share({ title: item.name, text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 18,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 480,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Photo */}
        <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-elevated)' }}>
          {item.photo_url || item.photo_path ? (
            <img
              src={item.photo_url || item.photo_path}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 48, opacity: 0.2 }}>📦</span>
            </div>
          )}
        </div>

        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
                {item.name}
              </h2>
              {(item.make || item.model) && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {[item.make, item.model].filter(Boolean).join(' ')}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1 }}>×</span>
            </button>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 16 }}>
            {item.asking_price > 0 ? fmt(item.asking_price) : 'Make offer'}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {item.condition && (
              <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '3px 10px', color: 'var(--text-secondary)' }}>
                {item.condition}
              </span>
            )}
            {item.location && (
              <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '3px 10px', color: 'var(--text-secondary)' }}>
                📍 {item.location}
              </span>
            )}
            {(item.quantity || 1) > 1 && (
              <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)', borderRadius: 6, padding: '3px 10px', color: 'var(--accent-gold)' }}>
                {item.quantity} available
              </span>
            )}
          </div>

          {item.notes && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              {item.notes}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sellerContact ? (
              <a
                href={sellerContact.includes('@') ? `mailto:${sellerContact}` : `tel:${sellerContact}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '11px', borderRadius: 10,
                  background: 'var(--accent-gold)', color: '#000',
                  fontSize: 13, fontWeight: 700, textDecoration: 'none',
                }}
              >
                Contact Seller
              </a>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px 0' }}>
                Message the seller to purchase this item.
              </div>
            )}
            <button
              onClick={shareItem}
              style={{
                padding: '9px', borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'transparent', color: 'var(--text-secondary)',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Share Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: '#0a0a0b',
  color: '#e8e8ea',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};
