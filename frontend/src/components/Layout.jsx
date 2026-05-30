import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { LogOut, LayoutDashboard, Users, CreditCard, FileText, Shield, Menu, X, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Layout() {
  const { token, logout, isSyncing, isDarkMode, toggleDarkMode } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Tutup sidebar mobile saat pindah halaman
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (!token) return null;

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          isActive 
            ? 'bg-blue-50 text-blue-600 font-bold dark:bg-blue-900/50 dark:text-blue-400' 
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <Icon size={20} /> {label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-gray-800 shadow-sm z-20 flex justify-between items-center p-4 transition-colors">
        <img src="/logo-irz.svg" className='px-5' width="100" height="50" alt="Logo" />
        <div className="flex items-center gap-4">
          <button onClick={toggleDarkMode} className="text-gray-500 dark:text-gray-400">
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="text-gray-600 dark:text-gray-300">
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col z-40 transition-transform duration-300 ease-in-out`}>
        <div className="p-4 bg-blue-400 text-white text-xl font-bold flex items-center justify-between">
          <img src="/logo-irz.svg" className='px-2' width="100" height="50" alt="Logo" />
          <div className="flex items-center gap-2">
            {isSyncing && <span className="text-xs bg-yellow-400 text-black px-2 py-1 rounded-full animate-pulse">Syncing</span>}
            <button onClick={toggleDarkMode} className="hidden md:block p-1 rounded-full hover:bg-white/20 transition-colors">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/customers" icon={Users} label="Pelanggan" />
          <NavItem to="/payments" icon={CreditCard} label="Pembayaran" />
          <NavItem to="/reports" icon={FileText} label="Laporan" />
          <NavItem to="/users" icon={Shield} label="User Control" />
        </nav>
        <div className="p-4 border-t dark:border-gray-700">
          <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
            <LogOut size={20} /> Keluar
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 pt-20 md:pt-8 md:p-8">
        <Outlet />
      </div>
    </div>
  );
}
