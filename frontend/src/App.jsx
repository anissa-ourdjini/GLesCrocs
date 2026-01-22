import { useState } from 'react';
import { Menu } from 'lucide-react';
import Client from './pages/Client';
import Admin from './pages/Admin';

export default function App() {
  const [view, setView] = useState('client');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-orange-50">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center">
              <img src="/assets/logo.png" alt="GLesCrocs" className="w-20 h-20 md:w-28 md:h-28 rounded-md bg-white/80 p-2" onError={(e)=>{e.target.style.display='none'}} />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => setView('client')}
                className="px-6 py-2 rounded-lg font-semibold text-slate-700 hover:text-primary-600"
              >
                Client
              </button>
              <button
                onClick={() => setView('admin')}
                className="px-6 py-2 rounded-lg font-semibold text-slate-700 hover:text-primary-600"
              >
                Admin
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-slate-700" />
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <button onClick={() => { setView('client'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 rounded">
                 Client
              </button>
              <button onClick={() => { setView('admin'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 rounded">
                 Admin
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'client' && <Client />}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}
