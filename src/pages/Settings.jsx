import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Cloud, Download } from 'lucide-react';
import { useApp } from '../App.jsx';
import CategoryManager from '../components/categories/CategoryManager.jsx';

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
  const { items, stats } = useApp();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [cloudPhotos, setCloudPhotos] = useState(false);

  useEffect(() => {
    window.stash.getSetting('FEATURE_FIREBASE_SYNC').then(v => setSyncEnabled(v === 'true'));
    window.stash.getSetting('FEATURE_CLOUD_PHOTOS').then(v => setCloudPhotos(v === 'true'));
  }, []);

  function exportAll() {
    const allItems = items;
    const header = 'Name,Make,Model,Category,Condition,Est Value,Asking Price,Sold Price,Platform,Status,Notes,Added At\n';
    const rows = allItems.map(i =>
      [i.name, i.make||'', i.model||'', i.category_id||'', i.condition||'',
       i.est_value||'', i.asking_price||'', i.sold_price||'', i.sold_platform||'',
       i.status, i.notes||'', i.added_at||'']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    window.stash.exportCsv(header + rows);
  }

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 24 }}>
        Settings
      </h2>

      <Section title="Categories" description="Manage your inventory categories.">
        <CategoryManager />
      </Section>

      <Section title="Cloud Sync" description="Sync your inventory across devices via Firebase.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Toggle
            label="Firebase Sync"
            description="Requires a license key and Firebase project setup."
            value={syncEnabled}
            onChange={v => {
              setSyncEnabled(v);
              window.stash.setSetting('FEATURE_FIREBASE_SYNC', String(v));
            }}
          />
          <Toggle
            label="Cloud Photo Backup"
            description="Upload item photos to Firebase Storage."
            value={cloudPhotos}
            onChange={v => {
              setCloudPhotos(v);
              window.stash.setSetting('FEATURE_CLOUD_PHOTOS', String(v));
            }}
          />
          {syncEnabled && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(91,142,240,0.08)',
              border: '1px solid rgba(91,142,240,0.2)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--accent-blue)',
            }}>
              Configure your Firebase project in the .env file. See .env.example for required variables.
            </div>
          )}
        </div>
      </Section>

      <Section title="Data" description="Export or manage your inventory data.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
