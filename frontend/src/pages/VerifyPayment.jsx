import { useState } from 'react';
import axios from 'axios';
import { Search, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function VerifyPayment() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setError(false);
    setResult(null);

    try {
      // Create a temporary axios instance to avoid sending auth tokens
      // since this is a public endpoint and user might not be logged in
      const res = await axios.get(`${API_URL}/payments/verify/${code.trim()}`);
      setResult(res.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/10 rounded-b-[100px] z-0"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-blue-700 font-medium mb-6 transition-colors">
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded-full shadow-lg border border-gray-100">
              <Search className="text-primary w-10 h-10" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Cek Keaslian Nota
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Masukkan kode referensi pembayaran (Contoh: IRW-20260530-A1B2)
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl shadow-blue-900/5 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleVerify}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Kode Referensi
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  placeholder="IRW-..."
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-mono uppercase transition-shadow"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Memeriksa...
                  </>
                ) : (
                  'Verifikasi Pembayaran'
                )}
              </button>
            </div>
          </form>

          {/* Results Section */}
          <div className="mt-8 transition-all duration-300">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-800">Nota Tidak Ditemukan</h3>
                  <div className="mt-1 text-sm text-red-700">
                    <p>Kode referensi yang Anda masukkan tidak valid atau pembayaran belum tercatat di sistem.</p>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-xl bg-green-50 p-4 border border-green-100 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex gap-3 mb-4 border-b border-green-200 pb-4">
                  <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-green-800">Pembayaran Valid</h3>
                    <p className="mt-1 text-xs text-green-700">Nota ini asli dan tercatat di sistem WifiPay.</p>
                  </div>
                </div>
                
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Kode Ref</dt>
                    <dd className="font-mono font-medium text-gray-900">{result.payment_code}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tanggal Bayar</dt>
                    <dd className="font-medium text-gray-900">{result.payment_date}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Pelanggan</dt>
                    <dd className="font-medium text-gray-900">{result.customer?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Bulan Tagihan</dt>
                    <dd className="font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{result.for_month}</dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-green-200/50 mt-3">
                    <dt className="text-gray-700 font-bold">Total Nominal</dt>
                    <dd className="font-black text-gray-900">{formatRupiah(result.amount)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
