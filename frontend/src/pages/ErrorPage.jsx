import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCcw, Home } from 'lucide-react';

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get('message') || 'Terjadi kesalahan tidak terduga pada server atau jaringan Anda.';
  const status = searchParams.get('status') || '500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Oops! Error {status}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {message}
        </p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => window.location.hash = '#/'}
            className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCcw size={20} /> Coba Lagi / Refresh
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Home size={20} /> Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
