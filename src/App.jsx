import { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
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
import { useStats } from './hooks/useStats.js';
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

  const { items, loading: itemsLoading, addItem, updateItem, deleteItem, markSold, refetch: refetchItems } = useItems();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { stats, refetch: refetchStats } = useStats();

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
    const newItem = await addItem(itemData);
    setShowAddModal(false);
    refetchStats();
    toast('Item added to Ledgr', 'success');
    return newItem;
  }, [addItem, refetchStats, toast]);

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
    stats,
    addItem: handleAddItem,
    updateItem: handleUpdateItem,
    deleteItem: handleDeleteItem,
    markSold: handleMarkSold,
    addCategory, updateCategory, deleteCategory,
    refetchItems, refetchStats,
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
