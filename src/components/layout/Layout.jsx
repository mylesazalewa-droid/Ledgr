import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

export default function Layout({ children }) {
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
