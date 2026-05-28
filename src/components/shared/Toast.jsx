import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, MessageCircle } from 'lucide-react';

const ToastContext = createContext(null);
export function useToast() { return useContext(ToastContext); }

const CONFIG = {
  success:     { Icon: CheckCircle, color: '#4caf7d', glow: 'rgba(76,175,125,0.20)' },
  error:       { Icon: XCircle,     color: '#e05c5c', glow: 'rgba(224,92,92,0.20)'  },
  info:        { Icon: Info,        color: '#5b8ef0', glow: 'rgba(91,142,240,0.20)' },
  achievement: { Icon: null,        color: '#ffcb74', glow: 'rgba(255,203,116,0.22)'},
  message:     { Icon: MessageCircle, color: '#ffcb74', glow: 'rgba(255,203,116,0.22)'},
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3000, subtitle = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, subtitle }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 9999,
          pointerEvents: 'none',
          width: '100%',
          maxWidth: 420,
          padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 16px 0',
          boxSizing: 'border-box',
        }}>
          <AnimatePresence mode="sync">
            {toasts.map(t => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const cfg  = CONFIG[toast.type] || CONFIG.info;
  const { Icon, color, glow } = cfg;
  const isAchievement = toast.type === 'achievement';
  const isMessage     = toast.type === 'message';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -20, scale: 0.94, transition: { duration: 0.18, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 440, damping: 32 }}
      onClick={() => onDismiss(toast.id)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        padding: '12px 14px',
        background: 'rgba(18, 18, 26, 0.92)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: `1px solid rgba(255,255,255,0.08)`,
        borderTop: `1px solid ${color}44`,
        borderRadius: 14,
        boxShadow: `0 4px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        pointerEvents: 'all',
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle color glow strip at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}88, transparent)`,
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `${glow}`,
        border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        {isAchievement
          ? <span style={{ fontSize: 15, lineHeight: 1 }}>{toast.message.split(' ')[0]}</span>
          : Icon && <Icon size={14} color={color} strokeWidth={2.2} />
        }
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isAchievement && (
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 2, opacity: 0.8 }}>
            Achievement Unlocked
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.3 }}>
          {isAchievement ? toast.message.split(' ').slice(1).join(' ') : toast.message}
        </div>
        {toast.subtitle && (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3, lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {toast.subtitle}
          </div>
        )}
      </div>
    </motion.div>
  );
}
