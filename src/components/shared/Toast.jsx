import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success:     CheckCircle,
  error:       XCircle,
  info:        Info,
  achievement: null, // uses emoji instead
};
const COLORS = {
  success:     'var(--accent-green)',
  error:       'var(--accent-red)',
  info:        'var(--accent-blue)',
  achievement: 'var(--accent-gold)',
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
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          <AnimatePresence>
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
  const Icon  = ICONS[toast.type] || Info;
  const color = COLORS[toast.type] || 'var(--accent-blue)';
  const isAchievement = toast.type === 'achievement';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{    opacity: 0, x: 40, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      style={{
        display: 'flex',
        alignItems: isAchievement ? 'flex-start' : 'center',
        gap: 10,
        padding: isAchievement ? '12px 14px' : '10px 14px',
        background: isAchievement ? 'rgba(212,168,83,0.08)' : 'var(--bg-elevated)',
        border: isAchievement
          ? '1px solid rgba(212,168,83,0.35)'
          : '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        maxWidth: 320,
        boxShadow: isAchievement
          ? '0 4px 24px rgba(212,168,83,0.15), var(--shadow-float)'
          : 'var(--shadow-float)',
        pointerEvents: 'all',
        cursor: 'default',
      }}
    >
      {isAchievement ? (
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{toast.message.split(' ')[0]}</span>
      ) : (
        Icon && <Icon size={15} color={color} style={{ flexShrink: 0 }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {isAchievement && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: 2 }}>
            Achievement Unlocked
          </div>
        )}
        <span style={{ fontSize: 13, fontWeight: isAchievement ? 600 : 400, color: 'var(--text-primary)' }}>
          {isAchievement ? toast.message.split(' ').slice(1).join(' ') : toast.message}
        </span>
        {toast.subtitle && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{toast.subtitle}</div>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)', display: 'flex', flexShrink: 0 }}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
