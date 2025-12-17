import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import Client from './pages/Client';
import Admin from './pages/Admin';
import LanguageSwitcher from './LanguageSwitcher';

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState('client');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-orange-50">
      {/* Header/Navigation */}
      <header className="glass sticky top-0 z-50 border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo only (no text) */}
            <div className="flex items-center">
              <img src="/assets/logo.png" alt="GLesCrocs" className="w-20 h-20 md:w-28 md:h-28 rounded-md bg-white/80 p-2" onError={(e)=>{e.target.style.display='none'}} />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => setView('client')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  view === 'client'
                    ? 'gradient-primary text-white shadow-lg'
                    : 'text-slate-600 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-500'
                }`}
              >
                👥 {t('nav.client')}
              </button>
              <button
                onClick={() => setView('admin')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  view === 'admin'
                    ? 'gradient-primary text-white shadow-lg'
                    : 'text-slate-600 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-500'
                }`}
              >
                🔐 {t('nav.admin')}
              </button>
              <div className="w-px h-8 bg-slate-200" />
              <LanguageSwitcher />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-3">
              <button
                onClick={() => {
                  setView('client');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                  view === 'client'
                    ? 'gradient-primary text-white'
                    : 'bg-white text-slate-600 border-2 border-primary-600'
                }`}
              >
                👥 {t('nav.client')}
              </button>
              <button
                onClick={() => {
                  setView('admin');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                  view === 'admin'
                    ? 'gradient-primary text-white'
                    : 'bg-white text-slate-600 border-2 border-primary-600'
                }`}
              >
                🔐 {t('nav.admin')}
              </button>
              <div className="pt-2 border-t border-slate-200">
                <LanguageSwitcher />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {view === 'client' ? <Client /> : <Admin />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600 text-sm">
          <p className="mt-2">Powered by Node.js & React</p>
        </div>
      </footer>
    </div>
  );
}

