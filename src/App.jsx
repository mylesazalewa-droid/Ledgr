import { useState, createContext, useContext, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Sold from './pages/Sold.jsx';
import Settings from './pages/Settings.jsx';
import House from './pages/House.jsx';
import ItemDrawer from './components/items/ItemDrawer.jsx';
import AddItemModal from './components/items/AddItemModal.jsx';
import ErrorBoundary from './components/shared/ErrorBoundary.jsx';
import { ToastProvider, useToast } from './components/shared/Toast.jsx';
import AuthScreen from './components/auth/AuthScreen.jsx';
import { useItems } from './hooks/useItems.js';
import { useCategories } from './hooks/useCategories.js';
import { useHomes } from './hooks/useHomes.js';
import { useMessages } from './hooks/useMessages.js';
import { computeStats } from './utils/computeStats.js';
import { isFirebaseConfigured, auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { ACHIEVEMENTS, getUnlocked, getSeenIds, markSeen } from './utils/achievements.js';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Sort helpers
const SORT_OPTIONS = [
  { id: 'newest',     label: 'Newest'         },
  { id: 'oldest',     label: 'Oldest'         },
  { id: 'price_desc', label: 'Price ↓'        },
  { id: 'price_asc',  label: 'Price ↑'        },
  { id: 'condition',  label: 'Condition'      },
  { id: 'days',       label: 'Days Listed'    },
];
export { SORT_OPTIONS };

const CONDITION_ORDER = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

function sortItems(items, sortBy) {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':     return new Date(a.added_at) - new Date(b.added_at);
      case 'price_desc': return (b.asking_price || 0) - (a.asking_price || 0);
      case 'price_asc':  return (a.asking_price || 0) - (b.asking_price || 0);
      case 'condition':  return CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition);
      case 'days':       return new Date(a.added_at) - new Date(b.added_at);
      default:           return new Date(b.added_at) - new Date(a.added_at);
    }
  });
}

function AppInner() {
  const toast = useToast();

  const [currentPage,        setCurrentPage]        = useState('dashboard');
  const [selectedCategory,   setSelectedCategory]   = useState(null);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [sortBy,             setSortBy]             = useState('newest');
  const [selectedItem,       setSelectedItem]       = useState(null);
  const [showAddModal,       setShowAddModal]       = useState(false);
  const [addModalQuick,      setAddModalQuick]      = useState(false);
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);

  const { items: allItems, loading: itemsLoading, addItem, updateItem, deleteItem, markSold, refetch: refetchItems } = useItems();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { homes, addHome, updateHome, deleteHome } = useHomes();
  const { messages: buyerMessages, unreadCount: unreadMessages, markRead: markMessageRead, markAllRead: markAllMessagesRead } = useMessages();

  // ── Active home ────────────────────────────────────────────────────────────
  const [activeHomeId, setActiveHomeIdRaw] = useState(() => {
    try { return localStorage.getItem('ledgr_active_home') || null; } catch { return null; }
  });

  const firstHomeId     = homes[0]?.id ?? 'home_default';
  const effectiveHomeId = homes.some(h => h.id === activeHomeId) ? activeHomeId : firstHomeId;

  function setActiveHomeId(id) {
    setActiveHomeIdRaw(id);
    try { localStorage.setItem('ledgr_active_home', id); } catch {}
  }

  // Items scoped to the active home (backwards-compat: no home_id → first home)
  const items = useMemo(() =>
    allItems.filter(i => (i.home_id || firstHomeId) === effectiveHomeId),
    [allItems, effectiveHomeId, firstHomeId]
  );

  // Stats derived from the home-scoped items — always in sync, no extra fetch
  const stats = useMemo(() => computeStats(items), [items]);

  // refetchStats is now a no-op alias — stats auto-recompute from items
  const refetchStats = refetchItems;

  // ── Achievement notifications ──────────────────────────────────────────────
  const achievementInitRef = useRef(false);
  useEffect(() => {
    if (!stats) return;
    if (!achievementInitRef.current) {
      // First load: silently mark all currently unlocked as seen so we
      // don't spam notifications for things the user already earned.
      achievementInitRef.current = true;
      markSeen(getUnlocked(stats).map(a => a.id));
      return;
    }
    // Subsequent updates: fire a toast for each newly unlocked achievement
    const seen = getSeenIds();
    const newlyUnlocked = ACHIEVEMENTS.filter(a => {
      try { return a.check(stats) && !seen.has(a.id); } catch { return false; }
    });
    if (newlyUnlocked.length === 0) return;
    markSeen(newlyUnlocked.map(a => a.id));
    // Show one at a time; stagger if multiple unlock simultaneously
    newlyUnlocked.forEach((a, i) => {
      setTimeout(() => {
        toast(`${a.icon} ${a.label}`, 'achievement', 5500, a.desc);
      }, i * 900);
    });
  }, [stats]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Buyer message notifications ────────────────────────────────────────────
  const msgInitRef  = useRef(false);
  const seenMsgIds  = useRef(new Set());
  useEffect(() => {
    if (!msgInitRef.current) {
      msgInitRef.current = true;
      buyerMessages.forEach(m => seenMsgIds.current.add(m.id));
      return;
    }
    const fresh = buyerMessages.filter(m => !seenMsgIds.current.has(m.id));
    fresh.forEach(m => seenMsgIds.current.add(m.id));
    fresh.forEach((m, i) => {
      setTimeout(() => {
        toast(`💬 ${m.buyerName} is interested in ${m.itemName}`, 'info', 6000, m.message);
      }, i * 900);
    });
  }, [buyerMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side filter + sort
  const filteredItems = sortItems(
    items.filter(item => {
      if (selectedCategory && item.category_id !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.name?.toLowerCase().includes(q) ||
          item.make?.toLowerCase().includes(q)  ||
          item.model?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    }),
    sortBy
  );

  // ---- Handlers ----
  const handleUpdateItem = useCallback(async (id, changes) => {
    const updated = await updateItem(id, changes);
    if (selectedItem?.id === id) setSelectedItem(updated);
    return updated;
  }, [updateItem, selectedItem]);

  const handleMarkSold = useCallback(async (id, saleData) => {
    const updated = await markSold(id, saleData);
    if (selectedItem?.id === id) setSelectedItem(updated);
    refetchStats();
    const remaining = updated?.quantity || 0;
    const msg = updated?.status === 'available' && remaining > 0
      ? `1 unit sold — ${remaining} remaining`
      : 'Item marked as sold!';
    toast(msg, 'success');
    return updated;
  }, [markSold, selectedItem, refetchStats, toast]);

  const handleAddItem = useCallback(async (itemData) => {
    // Ensure every new item is stamped with the active home
    const newItem = await addItem({ ...itemData, home_id: itemData.home_id || effectiveHomeId });
    setShowAddModal(false);
    toast('Item added to Ledgr', 'success');
    return newItem;
  }, [addItem, effectiveHomeId, toast]);

  const handleDeleteItem = useCallback(async (id) => {
    await deleteItem(id);
    setSelectedItem(null);
    refetchStats();
    toast('Item deleted', 'info');
  }, [deleteItem, refetchStats, toast]);

  // ── iOS keyboard zoom-reset ────────────────────────────────────────────────
  // When the on-screen keyboard dismisses on iOS, Safari sometimes leaves the
  // layout viewport scrolled — the fixed BottomNav stays mis-positioned until
  // the user manually scrolls. Listening to visualViewport resize lets us snap
  // back to origin the instant the viewport height grows (keyboard closed).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prevH = vv.height;
    function onVvResize() {
      if (vv.height > prevH) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      prevH = vv.height;
    }
    vv.addEventListener('resize', onVvResize);
    return () => vv.removeEventListener('resize', onVvResize);
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function onKey(e) {
      const active = document.activeElement;
      const typing = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;

      const meta = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        if (selectedItem)  { setSelectedItem(null);  return; }
        if (showAddModal)  { setShowAddModal(false);  return; }
      }
      if (typing) return;

      if (meta && e.key === 'n') { e.preventDefault(); setShowAddModal(true); }
      if (meta && e.key === 'f') { e.preventDefault(); setCurrentPage('inventory'); setSearchFocusTrigger(t => t + 1); }
      if (meta && e.key === ',') { e.preventDefault(); setCurrentPage('settings'); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItem, showAddModal]);

  function openQuickAdd() {
    setAddModalQuick(true);
    setShowAddModal(true);
  }

  const ctx = {
    currentPage, setCurrentPage,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    selectedItem, setSelectedItem,
    showAddModal, setShowAddModal,
    openQuickAdd,
    searchFocusTrigger,
    items, filteredItems, itemsLoading,
    categories,
    homes, activeHomeId: effectiveHomeId, setActiveHomeId,
    stats,
    addItem: handleAddItem,
    updateItem: handleUpdateItem,
    deleteItem: handleDeleteItem,
    markSold: handleMarkSold,
    addCategory, updateCategory, deleteCategory,
    addHome, updateHome, deleteHome,
    refetchItems, refetchStats,
    buyerMessages, unreadMessages, markMessageRead, markAllMessagesRead,
    toast,
  };

  return (
    <AppContext.Provider value={ctx}>
      <Layout>
        <ErrorBoundary>
          {/* key forces remount + re-triggers .page-enter animation on tab switch */}
          <div key={currentPage} className="page-enter" style={{ height: '100%' }}>
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'inventory' && <Inventory />}
            {currentPage === 'sold'      && <Sold />}
            {currentPage === 'settings'  && <Settings />}
            {currentPage === 'house'     && <House />}
          </div>
        </ErrorBoundary>
      </Layout>

      <AnimatePresence>
        {selectedItem && (
          <ItemDrawer key="drawer" item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddItemModal
            key="add-modal"
            initialQuickMode={addModalQuick}
            onClose={() => { setShowAddModal(false); setAddModalQuick(false); }}
          />
        )}
      </AnimatePresence>
    </AppContext.Provider>
  );
}

function AuthGate({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const isWeb = isFirebaseConfigured && !window.ledgr;

  useEffect(() => {
    if (!isWeb) { setUser(true); return; } // Electron — skip auth
    return onAuthStateChanged(auth, u => setUser(u));
  }, [isWeb]);

  if (user === undefined) return null; // Brief loading flicker prevention
  if (isWeb && !user) return <AuthScreen />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthGate>
        <AppInner />
      </AuthGate>
    </ToastProvider>
  );
}
