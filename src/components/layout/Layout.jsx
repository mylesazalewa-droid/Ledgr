import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import BottomNav from './BottomNav.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function Layout({ children }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}>
        <TopBar />
        <main style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--bg-base)',
        }}>
          {/*
           * Inner wrapper carries the bottom padding — NOT the scroll container.
           * iOS Safari ignores padding-bottom on overflow:auto elements when
           * computing scroll extent, so this keeps the last content visible
           * above the fixed BottomNav on every page.
           */}
          <div style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-void)',
      overflow: 'hidden',
    }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar />
        <main style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--bg-base)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
