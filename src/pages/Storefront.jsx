/**
 * Public Storefront — /shop/:userId
 * Renders a seller's available items to any visitor (no auth required).
 * Fetches from Firestore `storefronts/{userId}` (public collection).
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

// CSS injected once — always present so CSS vars work during loading/error states too
const GLOBAL_STYLES = `
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes sfFadeIn { from { opacity: 0; transform: translateY(8px); } }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #111111; color: #f6f6f6; }

  :root {
    --accent-gold:     #ffcb74;
    --accent-gold-dim: rgba(255,203,116,0.5);
    --accent-green:    #4caf7d;
    --text-primary:    #f6f6f6;
    --text-secondary:  #9a9a9a;
    --text-tertiary:   #555555;
    --bg-surface:      #1c1c1c;
    --bg-elevated:     #2f2f2f;
    --border-subtle:   rgba(255,255,255,0.07);
    --font-mono:       'JetBrains Mono', 'Fira Code', monospace;
  }

  /* ── Card interactions ───────────────────────────────────────── */
  .sf-card {
    cursor: pointer;
    transition: border-color 150ms, box-shadow 150ms, transform 150ms, opacity 150ms;
  }
  /* Hover only on pointer devices — prevents stuck-hover bug on iOS touch */
  @media (hover: hover) and (pointer: fine) {
    .sf-card:hover {
      border-color: rgba(212,168,83,0.35) !important;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }
    .sf-card:hover .sf-card-img {
      transform: scale(1.05);
    }
  }
  /* Touch active feedback */
  .sf-card:active { opacity: 0.75; transform: scale(0.98); }

  /* ── Item grid ───────────────────────────────────────────────── */
  /* 2 columns on phones, auto-fill on larger screens */
  .sf-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  @media (min-width: 540px) {
    .sf-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  }

  /* ── Item image ──────────────────────────────────────────────── */
  .sf-card-img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 250ms;
  }

  /* ── Overlay backdrop ───────────────────────────────────────── */
  /* Mobile: sheet slides from bottom; desktop: centered modal */
  .sf-overlay-backdrop {
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  @media (min-width: 600px) {
    .sf-overlay-backdrop { align-items: center; padding: 20px; }
  }

  /* ── Overlay panel ───────────────────────────────────────────── */
  .sf-overlay-panel {
    position: relative;
    width: 100%;
    border-radius: 20px 20px 0 0;
    max-height: 92dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: env(safe-area-inset-bottom, 16px);
    animation: sfFadeIn 0.2s ease;
  }
  @media (min-width: 600px) {
    .sf-overlay-panel {
      border-radius: 18px;
      max-height: min(90vh, 700px);
      max-width: 480px;
    }
  }

  /* ── Close button ────────────────────────────────────────────── */
  /* 44px touch target with centered 32px visual */
  .sf-close-btn {
    position: relative;
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    margin: -6px -6px -6px 0;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .sf-close-btn-inner {
    width: 32px; height: 32px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Share/copy button ───────────────────────────────────────── */
  .sf-share-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: border-color 150ms, color 150ms;
  }
  .sf-share-btn:active { opacity: 0.7; }

  /* ── Buttons ─────────────────────────────────────────────────── */
  .sf-btn-primary {
    display: flex; align-items: center; justify-content: center;
    padding: 13px;
    border-radius: 12px;
    background: var(--accent-gold);
    color: #000;
    font-size: 14px; font-weight: 700;
    text-decoration: none;
    border: none; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 150ms;
  }
  .sf-btn-primary:active { opacity: 0.8; }

  .sf-btn-secondary {
    display: flex; align-items: center; justify-content: center;
    padding: 11px;
    border-radius: 12px;
    border: 1px solid var(--border-subtle);
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: border-color 150ms, opacity 150ms;
  }
  .sf-btn-secondary:active { opacity: 0.7; }

  /* ── Filter bar ──────────────────────────────────────────────── */
  .sf-search-wrap { position: relative; }
  .sf-search-icon {
    position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
    pointer-events: none; opacity: 0.4;
  }
  .sf-search {
    width: 100%;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 9px 14px 9px 36px;
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    -webkit-appearance: none;
    transition: border-color 150ms;
  }
  .sf-search:focus { border-color: rgba(212,168,83,0.35); }
  .sf-search::placeholder { color: var(--text-tertiary); }

  .sf-pill {
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid var(--border-subtle);
    background: transparent;
    color: var(--text-secondary);
    font-size: 12px; font-weight: 500;
    cursor: pointer; white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: background 120ms, border-color 120ms, color 120ms;
  }
  .sf-pill:active { opacity: 0.7; }
  .sf-pill-on {
    background: rgba(212,168,83,0.12);
    border-color: rgba(212,168,83,0.4);
    color: var(--accent-gold);
  }
`;

export default function Storefront({ userId }) {
  const [storefront, setStorefront] = useState(null);
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selected,        setSelected]        = useState(null);
  const [copied,          setCopied]          = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [sortBy,          setSortBy]          = useState('');

  // globals.css locks html/body/#root with overflow:hidden + height:100dvh for
  // the main app shell. The storefront is a normal scrolling web page, so we
  // override those styles on mount and restore them on unmount.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlH: html.style.height,  htmlO: html.style.overflow,
      bodyH: body.style.height,  bodyO: body.style.overflow,
      rootH: root?.style.height, rootO: root?.style.overflow,
    };
    html.style.height = 'auto';  html.style.overflow = 'auto';
    body.style.height = 'auto';  body.style.overflow = 'auto';
    if (root) { root.style.height = 'auto'; root.style.overflow = 'visible'; }
    return () => {
      html.style.height = prev.htmlH; html.style.overflow = prev.htmlO;
      body.style.height = prev.bodyH; body.style.overflow = prev.bodyO;
      if (root) { root.style.height = prev.rootH; root.style.overflow = prev.rootO; }
    };
  }, []);

  useEffect(() => {
    if (!userId) { setError('Storefront not found.'); setLoading(false); return; }
    loadStorefront();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStorefront() {
    try {
      const profileSnap = await getDoc(doc(db, 'storefronts', userId));
      if (!profileSnap.exists() || !profileSnap.data().enabled) {
        setError('This storefront is not available.');
        setLoading(false);
        return;
      }
      setStorefront(profileSnap.data());

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

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${storefront?.displayName || 'Ledgr'} Shop`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }

  // Always inject CSS (so CSS vars are available during loading/error states)
  const styleTag = <style>{GLOBAL_STYLES}</style>;

  if (loading) {
    return (
      <div style={pageStyle}>
        {styleTag}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--accent-gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        {styleTag}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{error}</div>
        </div>
      </div>
    );
  }

  const availableItems = items.filter(i => i.status === 'available' || !i.status);

  // Unique conditions present in this shop's inventory
  const conditions = [...new Set(availableItems.map(i => i.condition).filter(Boolean))];

  // Apply search + condition filter + sort
  const filteredItems = availableItems
    .filter(item => {
      if (filterCondition && item.condition !== filterCondition) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.name?.toLowerCase().includes(q)  ||
          item.make?.toLowerCase().includes(q)  ||
          item.model?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return (a.asking_price || 0) - (b.asking_price || 0);
      if (sortBy === 'price_desc') return (b.asking_price || 0) - (a.asking_price || 0);
      return 0; // default: newest-first (preserved from Firestore orderBy)
    });

  return (
    <div style={pageStyle}>
      {styleTag}

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 24 }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          padding: `calc(16px + env(safe-area-inset-top, 0px)) 20px 16px`,
        }}>
          {/* Row 1: name + share */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '-0.01em' }}>
                  {storefront.displayName || 'Ledgr Shop'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#0a0a0b', background: 'var(--accent-gold)', borderRadius: 4, padding: '2px 7px',
                  whiteSpace: 'nowrap',
                }}>
                  {availableItems.length} {availableItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              {storefront.bio && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 3 }}>
                  {storefront.bio}
                </p>
              )}
              {storefront.contactInfo && (
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Contact: <span style={{ color: 'var(--text-secondary)' }}>{storefront.contactInfo}</span>
                </p>
              )}
            </div>

            {/* Share button */}
            <button className="sf-share-btn" onClick={handleShare} style={{ flexShrink: 0 }}>
              {copied ? (
                <span style={{ color: 'var(--accent-green)' }}>Copied!</span>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Share shop
                </>
              )}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
            Powered by <span style={{ color: 'var(--accent-gold-dim)' }}>Ledgr</span>
          </div>
        </div>
      </div>

      {/* Filter bar — only shown when there are items */}
      {availableItems.length > 0 && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 16px' }}>
          {/* Search input */}
          <div className="sf-search-wrap" style={{ marginBottom: 10 }}>
            <svg className="sf-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="sf-search"
              type="search"
              placeholder="Search items…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Condition pills + sort */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`sf-pill${!filterCondition ? ' sf-pill-on' : ''}`}
              onClick={() => setFilterCondition('')}
            >
              All
            </button>
            {conditions.map(c => (
              <button
                key={c}
                className={`sf-pill${filterCondition === c ? ' sf-pill-on' : ''}`}
                onClick={() => setFilterCondition(filterCondition === c ? '' : c)}
              >
                {c}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button
                className={`sf-pill${sortBy === 'price_asc' ? ' sf-pill-on' : ''}`}
                onClick={() => setSortBy(sortBy === 'price_asc' ? '' : 'price_asc')}
                title="Price: low to high"
              >
                $ ↑
              </button>
              <button
                className={`sf-pill${sortBy === 'price_desc' ? ' sf-pill-on' : ''}`}
                onClick={() => setSortBy(sortBy === 'price_desc' ? '' : 'price_desc')}
                title="Price: high to low"
              >
                $ ↓
              </button>
            </div>
          </div>

          {/* Results count when filtering */}
          {(searchQuery || filterCondition) && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              {filteredItems.length} of {availableItems.length} item{availableItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Item grid */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: `0 16px calc(60px + env(safe-area-inset-bottom, 0px))` }}>
        {availableItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '60px 0 20px', fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📦</div>
            No items listed yet — check back soon.
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px 0 20px', fontSize: 14 }}>
            No items match your search.
          </div>
        ) : (
          <div className="sf-grid">
            {filteredItems.map(item => (
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
  return (
    <div
      className="sf-card"
      onClick={() => onSelect(item)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Photo */}
      <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        {item.photo_url || item.photo_path ? (
          <img
            className="sf-card-img"
            src={item.photo_url || item.photo_path}
            alt={item.name}
            loading="lazy"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28, opacity: 0.25 }}>📦</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        {(item.make || item.model) && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[item.make, item.model].filter(Boolean).join(' ')}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--accent-gold)' }}>
            {item.asking_price > 0 ? fmt(item.asking_price) : 'Offer'}
          </span>
          {item.condition && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>
              {item.condition}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemOverlay({ item, onClose, sellerContact }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  useEffect(() => {
    // Prevent body scroll while overlay is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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

  const contactHref = sellerContact
    ? (sellerContact.includes('@') ? `mailto:${sellerContact}` : `tel:${sellerContact}`)
    : null;

  return (
    <div
      className="sf-overlay-backdrop"
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
      }}
    >
      <div className="sf-overlay-panel" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}>
        {/* Photo */}
        <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-elevated)', flexShrink: 0 }}>
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

        <div style={{ padding: '20px 20px 24px' }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.2 }}>
                {item.name}
              </h2>
              {(item.make || item.model) && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {[item.make, item.model].filter(Boolean).join(' ')}
                </div>
              )}
            </div>
            <button className="sf-close-btn" onClick={onClose} aria-label="Close">
              <div className="sf-close-btn-inner">
                <span style={{ color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1, marginTop: -1 }}>×</span>
              </div>
            </button>
          </div>

          {/* Price */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 14 }}>
            {item.asking_price > 0 ? fmt(item.asking_price) : 'Make offer'}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            {item.condition && (
              <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '3px 10px', color: 'var(--text-secondary)' }}>
                {item.condition}
              </span>
            )}
            {(item.quantity || 1) > 1 && (
              <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)', borderRadius: 6, padding: '3px 10px', color: 'var(--accent-gold)' }}>
                {item.quantity} available
              </span>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              {item.notes}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contactHref ? (
              <a href={contactHref} className="sf-btn-primary">
                Contact Seller
              </a>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px 0' }}>
                Message the seller to purchase this item.
              </div>
            )}
            <button className="sf-btn-secondary" onClick={shareItem}>
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
  background: '#111111',
  color: '#f6f6f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};
