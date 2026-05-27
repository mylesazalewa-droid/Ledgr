import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Cloud, LogOut, Globe, Copy, Check, RefreshCw } from 'lucide-react';
import { useApp } from '../App.jsx';
import CategoryManager from '../components/categories/CategoryManager.jsx';
import { storage, isElectron } from '../services/storage.js';
import { auth, isFirebaseConfigured } from '../firebase.js';
import { signOut } from 'firebase/auth';

function Section({ title, description, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{description}</div>}
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </motion.div>
  );
}

function Toggle({ value, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22,
          borderRadius: 11,
          background: value ? 'var(--accent-gold)' : 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 150ms',
        }}
      >
        <div style={{
          width: 16, height: 16,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 2,
          left: value ? 20 : 2,
          transition: 'left 150ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { items, stats, toast } = useApp();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [cloudPhotos, setCloudPhotos] = useState(false);

  // Storefront state (web only)
  const [storefrontEnabled,  setStorefrontEnabled]  = useState(false);
  const [storefrontLoading,  setStorefrontLoading]  = useState(false);
  const [storefrontSyncing,  setStorefrontSyncing]  = useState(false);
  const [sfDisplayName,      setSfDisplayName]      = useState('');
  const [sfBio,              setSfBio]              = useState('');
  const [sfContact,          setSfContact]          = useState('');
  const [urlCopied,          setUrlCopied]          = useState(false);
  const storefrontUrl = isFirebaseConfigured && auth?.currentUser
    ? `${window.location.origin}/shop/${auth.currentUser.uid}`
    : null;

  useEffect(() => {
    if (!isElectron) return; // These settings are Electron-only feature flags
    storage.getSetting('FEATURE_FIREBASE_SYNC').then(v => setSyncEnabled(v === 'true'));
    storage.getSetting('FEATURE_CLOUD_PHOTOS').then(v => setCloudPhotos(v === 'true'));
  }, []);

  useEffect(() => {
    if (isElectron || !isFirebaseConfigured) return;
    storage.getStorefrontStatus?.().then(data => {
      if (data) {
        setStorefrontEnabled(!!data.enabled);
        setSfDisplayName(data.displayName || '');
        setSfBio(data.bio || '');
        setSfContact(data.contactInfo || '');
      }
    });
  }, []);

  async function handleStorefrontToggle(enabled) {
    setStorefrontLoading(true);
    try {
      if (enabled) {
        await storage.enableStorefront?.({ displayName: sfDisplayName, bio: sfBio, contactInfo: sfContact });
        setStorefrontEnabled(true);
        toast?.('Storefront enabled — your items are now public', 'success');
      } else {
        await storage.disableStorefront?.();
        setStorefrontEnabled(false);
        toast?.('Storefront disabled', 'info');
      }
    } catch (err) {
      toast?.('Failed to update storefront: ' + err.message, 'error');
    } finally {
      setStorefrontLoading(false);
    }
  }

  async function handleSyncStorefront() {
    setStorefrontSyncing(true);
    try {
      await storage.syncStorefrontItems?.();
      toast?.('Storefront synced with latest inventory', 'success');
    } catch {
      toast?.('Sync failed — try again', 'error');
    } finally {
      setStorefrontSyncing(false);
    }
  }

  async function saveStorefrontProfile() {
    if (!storefrontEnabled) return;
    try {
      await storage.updateStorefrontProfile?.({ displayName: sfDisplayName, bio: sfBio, contactInfo: sfContact });
      toast?.('Profile updated', 'success');
    } catch {
      toast?.('Update failed', 'error');
    }
  }

  function copyUrl() {
    if (!storefrontUrl) return;
    navigator.clipboard.writeText(storefrontUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  function exportAll() {
    const header = 'Name,Make,Model,Category,Condition,Est Value,Asking Price,Sold Price,Platform,Status,Notes,Added At\n';
    const rows = items.map(i =>
      [i.name, i.make||'', i.model||'', i.category_id||'', i.condition||'',
       i.est_value||'', i.asking_price||'', i.sold_price||'', i.sold_platform||'',
       i.status, i.notes||'', i.added_at||'']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    storage.exportCsv(header + rows);
  }

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 24 }}>
        Settings
      </h2>

      <Section title="Categories" description="Manage your inventory categories.">
        <CategoryManager />
      </Section>

      {/* Cloud sync section — only relevant in Electron (desktop) */}
      {isElectron ? (
        <Section title="Cloud Sync" description="Sync your inventory across devices via Firebase.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Toggle
              label="Firebase Sync"
              description="Requires Firebase project setup."
              value={syncEnabled}
              onChange={v => {
                setSyncEnabled(v);
                storage.setSetting('FEATURE_FIREBASE_SYNC', String(v));
              }}
            />
            <Toggle
              label="Cloud Photo Backup"
              description="Upload item photos to Firebase Storage."
              value={cloudPhotos}
              onChange={v => {
                setCloudPhotos(v);
                storage.setSetting('FEATURE_CLOUD_PHOTOS', String(v));
              }}
            />
          </div>
        </Section>
      ) : (
        <Section title="Cloud Sync">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cloud size={16} color="var(--accent-blue)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Synced via Firebase</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                Your data syncs automatically across all devices.
              </div>
            </div>
            {isFirebaseConfigured && (
              <button
                onClick={() => signOut(auth)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(224,92,92,0.25)',
                  background: 'rgba(224,92,92,0.07)',
                  color: 'var(--accent-red)',
                  fontSize: 12,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <LogOut size={13} /> Sign Out
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Public Storefront — web only */}
      {!isElectron && isFirebaseConfigured && (
        <Section title="Public Storefront" description="Share a public page where anyone can browse your available items.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Toggle
              label="Enable Public Storefront"
              description={storefrontEnabled ? 'Your items are publicly visible' : 'Enable to share a public shop link'}
              value={storefrontEnabled}
              onChange={handleStorefrontToggle}
            />

            {storefrontEnabled && storefrontUrl && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(212,168,83,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-gold-dim)', marginBottom: 6 }}>
                  Your Shop URL
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                    {storefrontUrl}
                  </span>
                  <button
                    onClick={copyUrl}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(212,168,83,0.25)', background: 'rgba(212,168,83,0.07)', color: urlCopied ? 'var(--accent-green)' : 'var(--accent-gold)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                  >
                    {urlCopied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, textDecoration: 'none', flexShrink: 0 }}
                  >
                    <Globe size={11} /> Open
                  </a>
                </div>
              </div>
            )}

            {storefrontEnabled && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Profile</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={sfDisplayName}
                    onChange={e => setSfDisplayName(e.target.value)}
                    onBlur={saveStorefrontProfile}
                    placeholder="Your name / shop name"
                    style={inputStyle}
                  />
                  <textarea
                    value={sfBio}
                    onChange={e => setSfBio(e.target.value)}
                    onBlur={saveStorefrontProfile}
                    placeholder="Short description (optional)"
                    rows={2}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                  <input
                    value={sfContact}
                    onChange={e => setSfContact(e.target.value)}
                    onBlur={saveStorefrontProfile}
                    placeholder="Contact info shown to buyers (email, phone, etc.)"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Sync Inventory</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Push latest items to your public page
                    </div>
                  </div>
                  <button
                    onClick={handleSyncStorefront}
                    disabled={storefrontSyncing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(212,168,83,0.25)', background: 'rgba(212,168,83,0.07)', color: storefrontSyncing ? 'var(--text-tertiary)' : 'var(--accent-gold)', fontSize: 12, cursor: 'pointer', opacity: storefrontSyncing ? 0.7 : 1 }}
                  >
                    <RefreshCw size={12} style={storefrontSyncing ? { animation: 'spin 1s linear infinite' } : {}} />
                    {storefrontSyncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                </div>
              </>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Note: after enabling, deploy <a href="https://firebase.google.com/docs/firestore/security/rules-overview" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold-dim)' }}>Firestore rules</a> to allow public reads on the <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>storefronts</code> collection.
            </div>
          </div>
        </Section>
      )}

      <Section title="Data" description="Export your inventory data.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Export All as CSV</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{items.length} items</div>
          </div>
          <button
            onClick={exportAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </Section>

      <Section title="About">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Version</span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total items</span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{items.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total earned</span>
            <span style={{ fontSize: 12, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalEarned)}
            </span>
          </div>
        </div>
      </Section>
    </div>
  );
}

const inputStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-body)',
};
