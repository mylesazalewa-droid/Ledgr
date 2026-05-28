import { useEffect, useState } from 'react';
import {
  Download, Cloud, LogOut, Globe, Copy, Check, RefreshCw,
  Package, TrendingUp, Info, DollarSign,
  Image as ImageIcon, Link, Tag,
} from 'lucide-react';
import { useApp } from '../App.jsx';
import CategoryManager from '../components/categories/CategoryManager.jsx';
import { storage, isElectron } from '../services/storage.js';
import { auth, isFirebaseConfigured } from '../firebase.js';
import { signOut } from 'firebase/auth';

// ── Primitives ────────────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)',
      padding: '20px 4px 8px',
    }}>
      {label}
    </div>
  );
}

function SettingsCard({ children, overflow = 'hidden' }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      overflow,
    }}>
      {children}
    </div>
  );
}

function RowDivider() {
  return (
    <div style={{
      height: 1,
      background: 'var(--border-subtle)',
      marginLeft: 60,
    }} />
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 200ms ease, box-shadow 200ms ease',
        boxShadow: value ? '0 0 12px rgba(255,203,116,0.38)' : 'none',
      }}
    >
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: value ? 23 : 3,
        transition: 'left 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

function SettingsRow({ icon: Icon, iconBg, iconColor = 'var(--text-secondary)', label, description, right, onClick, danger }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        cursor: onClick ? 'pointer' : 'default',
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'background 80ms',
        minHeight: 52,
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: iconBg || (danger ? 'rgba(224,92,92,0.1)' : 'rgba(255,255,255,0.05)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {Icon && (
          <Icon size={15} color={danger ? 'var(--accent-red)' : iconColor} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: danger ? 'var(--accent-red)' : 'var(--text-primary)',
          lineHeight: 1.2,
        }}>
          {label}
        </div>
        {description && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {description}
          </div>
        )}
      </div>

      {right && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {right}
        </div>
      )}
    </div>
  );
}

// ── Account header card ───────────────────────────────────────────────────────

function AccountHeader({ user, items, stats }) {
  const listed  = (items || []).filter(i => i.status !== 'sold').length;
  const sold    = (items || []).filter(i => i.status === 'sold').length;
  const earned  = stats?.totalEarned ?? 0;
  const fmtCur  = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const STATS = [
    { label: 'Listed', value: listed,       mono: true,  color: 'var(--text-primary)' },
    { label: 'Sold',   value: sold,         mono: true,  color: 'var(--text-primary)' },
    { label: 'Earned', value: fmtCur(earned), mono: true, color: 'var(--accent-green)' },
  ];

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding: '16px 18px 14px',
      marginBottom: 4,
    }}>
      {/* Top row — icon, name, sync badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(145deg, rgba(255,203,116,0.18) 0%, rgba(255,203,116,0.06) 100%)',
          border: '1px solid rgba(255,203,116,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <DollarSign size={18} color="var(--accent-gold)" strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
          }}>
            Ledgr
          </div>
          {user?.email && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.email}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 20,
          background: 'rgba(76,175,125,0.1)',
          border: '1px solid rgba(76,175,125,0.18)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 6px rgba(76,175,125,0.7)',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-green)', letterSpacing: '0.03em' }}>
            {isElectron ? 'Local' : 'Synced'}
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'flex',
        gap: 1,
        paddingTop: 13,
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{
            flex: 1,
            textAlign: 'center',
            padding: '2px 0',
            borderRight: i < STATS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: s.color,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: 9,
              color: 'var(--text-tertiary)',
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { items, stats, toast } = useApp();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [cloudPhotos, setCloudPhotos] = useState(false);

  // Storefront state (web only)
  const [storefrontEnabled, setStorefrontEnabled] = useState(false);
  const [storefrontSyncing, setStorefrontSyncing] = useState(false);
  const [sfDisplayName,     setSfDisplayName]     = useState('');
  const [sfBio,             setSfBio]             = useState('');
  const [sfContact,         setSfContact]         = useState('');
  const [urlCopied,         setUrlCopied]         = useState(false);

  const user = auth?.currentUser ?? null;
  const storefrontUrl = isFirebaseConfigured && auth?.currentUser
    ? `${window.location.origin}/shop/${auth.currentUser.uid}`
    : null;

  useEffect(() => {
    if (!isElectron) return;
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

  const fmtCur = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{ padding: '24px 24px 64px', maxWidth: 680 }}>

      {/* Page heading */}
      <h1 style={{
        fontFamily:    'var(--font-display)',
        fontSize:      28,
        fontWeight:    400,
        letterSpacing: '-0.03em',
        color:         'var(--text-primary)',
        margin:        '0 0 18px',
        lineHeight:    1,
      }}>
        Settings
      </h1>

      {/* Account card */}
      <AccountHeader user={user} items={items} stats={stats} />

      {/* ── Categories ── */}
      <SectionLabel label="Categories" />
      <div style={{
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: 14,
        padding:      '8px 0',
      }}>
        <CategoryManager />
      </div>

      {/* ── Sync ── */}
      {isElectron ? (
        <>
          <SectionLabel label="Cloud Sync" />
          <SettingsCard>
            <SettingsRow
              icon={Cloud}
              iconBg="rgba(91,142,240,0.1)"
              iconColor="var(--accent-blue)"
              label="Firebase Sync"
              description="Sync inventory across all your devices"
              right={
                <Toggle
                  value={syncEnabled}
                  onChange={v => {
                    setSyncEnabled(v);
                    storage.setSetting('FEATURE_FIREBASE_SYNC', String(v));
                  }}
                />
              }
            />
            <RowDivider />
            <SettingsRow
              icon={ImageIcon}
              iconBg="rgba(91,142,240,0.1)"
              iconColor="var(--accent-blue)"
              label="Cloud Photo Backup"
              description="Upload item photos to Firebase Storage"
              right={
                <Toggle
                  value={cloudPhotos}
                  onChange={v => {
                    setCloudPhotos(v);
                    storage.setSetting('FEATURE_CLOUD_PHOTOS', String(v));
                  }}
                />
              }
            />
          </SettingsCard>
        </>
      ) : (
        <>
          <SectionLabel label="Sync" />
          <SettingsCard>
            <SettingsRow
              icon={Cloud}
              iconBg="rgba(76,175,125,0.1)"
              iconColor="var(--accent-green)"
              label="Cloud Sync Active"
              description="Data syncs in real-time across all devices"
              right={
                <div style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        5,
                  padding:    '3px 9px',
                  borderRadius: 20,
                  background: 'rgba(76,175,125,0.1)',
                  border:     '1px solid rgba(76,175,125,0.18)',
                  fontSize:   10,
                  fontWeight: 700,
                  color:      'var(--accent-green)',
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--accent-green)',
                    boxShadow: '0 0 5px rgba(76,175,125,0.8)',
                  }} />
                  Live
                </div>
              }
            />
          </SettingsCard>
        </>
      )}

      {/* ── Public Storefront (web + Firebase) ── */}
      {!isElectron && isFirebaseConfigured && (
        <>
          <SectionLabel label="Public Storefront" />
          <SettingsCard>
            <SettingsRow
              icon={Globe}
              iconBg="rgba(255,203,116,0.1)"
              iconColor="var(--accent-gold)"
              label="Public Storefront"
              description={storefrontEnabled ? 'Your items are publicly visible' : 'Share a browseable shop link'}
              right={<Toggle value={storefrontEnabled} onChange={handleStorefrontToggle} />}
            />

            {storefrontEnabled && storefrontUrl && (
              <>
                <RowDivider />
                <SettingsRow
                  icon={Link}
                  label="Shop URL"
                  description={storefrontUrl}
                  right={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={copyUrl}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 7,
                          border: '1px solid rgba(255,203,116,0.25)',
                          background: 'rgba(255,203,116,0.07)',
                          color: urlCopied ? 'var(--accent-green)' : 'var(--accent-gold)',
                          fontSize: 11, cursor: 'pointer', fontWeight: 500,
                          transition: 'color 100ms',
                        }}
                      >
                        {urlCopied
                          ? <><Check size={11} /> Copied</>
                          : <><Copy size={11} /> Copy</>}
                      </button>
                      <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 7,
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          fontSize: 11, textDecoration: 'none', fontWeight: 500,
                        }}
                      >
                        <Globe size={11} /> Open
                      </a>
                    </div>
                  }
                />

                <RowDivider />
                <SettingsRow
                  icon={RefreshCw}
                  label="Sync Inventory"
                  description="Push latest items to your public page"
                  right={
                    <button
                      onClick={handleSyncStorefront}
                      disabled={storefrontSyncing}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8,
                        border: '1px solid rgba(255,203,116,0.22)',
                        background: 'rgba(255,203,116,0.07)',
                        color: storefrontSyncing ? 'var(--text-tertiary)' : 'var(--accent-gold)',
                        fontSize: 11, cursor: 'pointer', fontWeight: 500,
                        opacity: storefrontSyncing ? 0.65 : 1,
                        transition: 'opacity 100ms',
                      }}
                    >
                      <RefreshCw
                        size={12}
                        style={storefrontSyncing ? { animation: 'spin 1s linear infinite' } : {}}
                      />
                      {storefrontSyncing ? 'Syncing…' : 'Sync Now'}
                    </button>
                  }
                />
              </>
            )}
          </SettingsCard>

          {/* Storefront profile inputs */}
          {storefrontEnabled && (
            <>
              <SectionLabel label="Storefront Profile" />
              <SettingsCard overflow="visible">
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    placeholder="Contact info shown to buyers (email, phone…)"
                    style={inputStyle}
                  />
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: '2px 0 0' }}>
                    Changes save automatically. Deploy{' '}
                    <a
                      href="https://firebase.google.com/docs/firestore/security/rules-overview"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-gold-dim)' }}
                    >
                      Firestore rules
                    </a>
                    {' '}to allow public reads on the{' '}
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 9 }}>storefronts</code>
                    {' '}collection.
                  </p>
                </div>
              </SettingsCard>
            </>
          )}
        </>
      )}

      {/* ── Data ── */}
      <SectionLabel label="Data" />
      <SettingsCard>
        <SettingsRow
          icon={Download}
          label="Export as CSV"
          description={`${items.length} item${items.length !== 1 ? 's' : ''} · full inventory snapshot`}
          onClick={exportAll}
          right={
            <div style={{
              padding: '5px 12px', borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              fontSize: 11, color: 'var(--text-secondary)',
              fontWeight: 500, pointerEvents: 'none',
            }}>
              Export
            </div>
          }
        />
      </SettingsCard>

      {/* ── About ── */}
      <SectionLabel label="About" />
      <SettingsCard>
        <SettingsRow
          icon={Info}
          label="Version"
          right={
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
              1.0.0
            </span>
          }
        />
        <RowDivider />
        <SettingsRow
          icon={Package}
          label="Total Items"
          right={
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {items.length}
            </span>
          }
        />
        <RowDivider />
        <SettingsRow
          icon={TrendingUp}
          iconBg="rgba(76,175,125,0.08)"
          iconColor="var(--accent-green)"
          label="Total Earned"
          right={
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-green)' }}>
              {fmtCur(stats?.totalEarned ?? 0)}
            </span>
          }
        />
      </SettingsCard>

      {/* ── Account / Sign Out ── */}
      {isFirebaseConfigured && !isElectron && (
        <>
          <SectionLabel label="Account" />
          <SettingsCard>
            <SettingsRow
              icon={LogOut}
              label="Sign Out"
              danger
              onClick={() => signOut(auth)}
            />
          </SettingsCard>
        </>
      )}

    </div>
  );
}

const inputStyle = {
  background:   'var(--bg-elevated)',
  border:       '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding:      '9px 12px',
  fontSize:     13,
  color:        'var(--text-primary)',
  outline:      'none',
  width:        '100%',
  fontFamily:   'var(--font-body)',
};
