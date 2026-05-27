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
          // nav pill (~68px) + top margin (8px) + gap from safe area (env)
          paddingBottom: 'calc(84px + env(safe-area-inset-bottom))',
        }}>
          {children}
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
