import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCcw, Home } from 'lucide-react';

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get('message') || 'Terjadi kesalahan tidak terduga pada server atau jaringan Anda.';
  const status = searchParams.get('status') || '500';

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Terjadi kesalahan ({status})</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => window.location.hash = '#/'}
            className="w-full bg-primary hover:bg-[#014a85] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCcw size={20} /> Muat ulang
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Home size={20} /> Ke beranda
          </button>
        </div>
      </div>
    </div>
  );
}
