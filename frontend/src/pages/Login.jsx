import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useStore } from '../store';

const inputCls = "w-full px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/login', { email, password });
      setAuth(res.data.user, res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError('Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <img src="./logo-irz.svg" alt="iRz Wi-Fi" width="96" height="69" className="h-20 w-auto mb-6 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Masuk</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">Kelola pembayaran WiFi pelanggan iRz.</p>

        {error && (
          <div role="alert" className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Alamat email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className={inputCls}
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className={`${inputCls} pr-12`}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 grid place-items-center w-12 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-r-lg"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-[#014a85] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
