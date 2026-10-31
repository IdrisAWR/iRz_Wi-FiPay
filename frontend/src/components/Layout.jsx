import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { LogOut, LayoutDashboard, Users, CreditCard, FileText, Shield, Sun, Moon } from 'lucide-react';
import { useEffect } from 'react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Pelanggan' },
  { to: '/payments', icon: CreditCard, label: 'Pembayaran' },
  { to: '/reports', icon: FileText, label: 'Laporan' },
  { to: '/users', icon: Shield, label: 'User' },
];

export default function Layout() {
  const { token, logout, isSyncing, isDarkMode, toggleDarkMode } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  if (!token) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const themeLabel = isDarkMode ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';
  const ThemeIcon = isDarkMode ? Sun : Moon;
  const themeIcon = (size) => <ThemeIcon key={String(isDarkMode)} size={size} className="icon-swap" />;

  return (
    <div className="flex h-dvh bg-gray-50 dark:bg-slate-900">
      <header className="no-print md:hidden fixed top-0 inset-x-0 z-20 h-14 px-4 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <img src="/logo-irz.svg" width="64" height="46" alt="iRz Wi-Fi" className="h-8 w-auto" />
        <div className="flex items-center gap-1">
          {isSyncing && <span className="text-xs text-gray-600 dark:text-gray-300 mr-2">Sinkronisasi…</span>}
          <button onClick={toggleDarkMode} aria-label={themeLabel} className="grid place-items-center size-11 rounded-lg text-gray-600 dark:text-gray-300">
            {themeIcon(20)}
          </button>
          <button onClick={handleLogout} aria-label="Keluar" className="grid place-items-center size-11 rounded-lg text-red-700 dark:text-red-400">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <aside className="no-print hidden md:flex w-60 shrink-0 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="px-5 py-5 flex items-center justify-between">
          <img src="/logo-irz.svg" width="72" height="52" alt="iRz Wi-Fi" className="h-10 w-auto" />
          {isSyncing && <span className="text-xs text-gray-600 dark:text-gray-300">Sinkronisasi…</span>}
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto" aria-label="Menu utama">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold dark:bg-sky-400/15 dark:text-sky-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/60'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <button onClick={toggleDarkMode} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
            {themeIcon(18)} {isDarkMode ? 'Tema terang' : 'Tema gelap'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto px-4 pt-[4.5rem] pb-24 md:p-8">
        <Outlet />
      </main>

      {/* Bottom nav menggantikan hamburger: tujuan utama tidak tersembunyi */}
      <nav
        aria-label="Menu utama"
        className="no-print md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] ${
                isActive ? 'text-primary font-semibold dark:text-sky-300' : 'text-gray-600 dark:text-gray-400'
              }`
            }
          >
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
