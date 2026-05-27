import { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Sold from './pages/Sold.jsx';
import Settings from './pages/Settings.jsx';
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
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);

  const { items, loading: itemsLoading, addItem, updateItem, deleteItem, markSold, refetch: refetchItems } = useItems();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { stats, refetch: refetchStats } = useStats();

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
    toast('Item added to stash', 'success');
    return newItem;
  }, [addItem, refetchStats, toast]);

  const handleDeleteItem = useCallback(async (id) => {
    await deleteItem(id);
    setSelectedItem(null);
    refetchStats();
    toast('Item deleted', 'info');
  }, [deleteItem, refetchStats, toast]);

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

  const ctx = {
    currentPage, setCurrentPage,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    selectedItem, setSelectedItem,
    showAddModal, setShowAddModal,
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
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'inventory' && <Inventory />}
          {currentPage === 'sold'      && <Sold />}
          {currentPage === 'settings'  && <Settings />}
        </ErrorBoundary>
      </Layout>

      <AnimatePresence>
        {selectedItem && (
          <ItemDrawer key="drawer" item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddItemModal key="add-modal" onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </AppContext.Provider>
  );
}

function AuthGate({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const isWeb = isFirebaseConfigured && !window.stash;

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
