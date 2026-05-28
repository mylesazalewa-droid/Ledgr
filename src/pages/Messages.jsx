import { motion } from 'framer-motion';
import { X, MessageCircle, Mail, Phone } from 'lucide-react';
import { useApp } from '../App.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function MessageRow({ msg, allItems, onRead }) {
  const item    = allItems.find(i => i.id === msg.itemId) || null;
  const photo   = item?.photo_url || item?.photo_path || null;
  const price   = item?.asking_price || msg.itemPrice || 0;

  const contact  = (msg.buyerContact || '').trim();
  const isEmail  = contact.includes('@');
  const replyHref = contact
    ? (isEmail ? `mailto:${contact}` : `sms:${contact}`)
    : null;

  const dateStr = msg.timestamp?.toDate
    ? new Date(msg.timestamp.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div
      onClick={onRead}
      style={{
        display: 'flex', gap: 12,
        padding: '14px 20px',
        background: msg.read ? 'transparent' : 'rgba(255,203,116,0.05)',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      {/* Item thumbnail */}
      <div style={{
        width: 60, height: 60, borderRadius: 10, flexShrink: 0,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {photo
          ? <img src={photo} alt={msg.itemName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 24, opacity: 0.35 }}>📦</span>
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Item name + price + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {!msg.read && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-gold)', flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {msg.itemName}
            </span>
            {price > 0 && (
              <span style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 600, flexShrink: 0 }}>
                {fmt(price)}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 8 }}>{dateStr}</span>
        </div>

        {/* Buyer name + contact */}
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 5 }}>
          from <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{msg.buyerName || 'Anonymous'}</span>
          {contact && (
            <span style={{ marginLeft: 4 }}>· {contact}</span>
          )}
        </div>

        {/* Message text */}
        <p style={{
          fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {msg.message}
        </p>

        {/* Reply button */}
        {replyHref && (
          <a
            href={replyHref}
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8,
              border: '1px solid rgba(255,203,116,0.28)',
              background: 'rgba(255,203,116,0.07)',
              color: 'var(--accent-gold)',
              fontSize: 11, fontWeight: 600, textDecoration: 'none',
            }}
          >
            {isEmail
              ? <><Mail size={11} /> Reply by Email</>
              : <><Phone size={11} /> Reply by Text</>
            }
          </a>
        )}
      </div>
    </div>
  );
}

export default function Messages({ onClose }) {
  const { buyerMessages, unreadMessages, markMessageRead, markAllMessagesRead, allItems } = useApp();
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: isMobile ? '100%' : 32, opacity: isMobile ? 1 : 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: isMobile ? '100%' : 32, opacity: isMobile ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 480,
          maxHeight: isMobile ? '90dvh' : '82vh',
          background: 'var(--bg-base)',
          borderRadius: isMobile ? '20px 20px 0 0' : 18,
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle (mobile) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Messages</span>
            {unreadMessages > 0 && (
              <span style={{
                background: 'var(--accent-gold)', color: '#000',
                fontSize: 10, fontWeight: 800, borderRadius: 10, padding: '2px 7px',
              }}>
                {unreadMessages} new
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {unreadMessages > 0 && (
              <button
                onClick={markAllMessagesRead}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-tertiary)', padding: 0 }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', display: 'flex' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {buyerMessages.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 220, gap: 12,
            }}>
              <MessageCircle size={38} color="var(--text-tertiary)" strokeWidth={1.2} />
              <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No messages yet</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', opacity: 0.7 }}>
                Buyers will message you from your shop page
              </span>
            </div>
          ) : (
            buyerMessages.map(msg => (
              <MessageRow
                key={msg.id}
                msg={msg}
                allItems={allItems || []}
                onRead={() => markMessageRead(msg.id)}
              />
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
