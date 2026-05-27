import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Storefront from './pages/Storefront.jsx'
import './styles/globals.css'

// Route /shop/:userId to the public Storefront — no auth required
const shopMatch = window.location.pathname.match(/^\/shop\/([^/]+)/);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {shopMatch
      ? <Storefront userId={shopMatch[1]} />
      : <App />
    }
  </React.StrictMode>
)
