import { useState } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
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
      // Endpoint publik: pakai axios polos agar token login tidak ikut terkirim.
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
    <div className="min-h-dvh bg-gray-50 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-blue-700 font-medium mb-6 transition-colors">
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            Cek Keaslian Nota
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Masukkan kode referensi yang tercetak di nota pembayaran.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-5 sm:p-8 rounded-xl border border-gray-200">
          <form className="space-y-6" onSubmit={handleVerify}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Kode Referensi
              </label>
              <div className="mt-1">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  placeholder="IRW-..."
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-lg font-mono uppercase"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-primary hover:bg-[#014a85] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Memeriksa…
                  </>
                ) : (
                  'Verifikasi Pembayaran'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 transition-all duration-300">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex gap-3">
                <XCircle className="h-6 w-6 text-red-700 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-800">Nota Tidak Ditemukan</h3>
                  <div className="mt-1 text-sm text-red-700">
                    <p>Kode referensi yang Anda masukkan tidak valid atau pembayaran belum tercatat di sistem.</p>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <div className="flex gap-3 mb-4 border-b border-green-200 pb-4">
                  <CheckCircle className="h-6 w-6 text-green-800 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-green-800">Pembayaran Valid</h3>
                    <p className="mt-1 text-sm text-green-800">Nota ini asli dan tercatat di sistem WifiPay.</p>
                  </div>
                </div>
                
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-600">Kode Ref</dt>
                    <dd className="font-mono font-medium text-gray-900">{result.payment_code}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-600">Tanggal Bayar</dt>
                    <dd className="font-medium text-gray-900">{result.payment_date}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-600">Pelanggan</dt>
                    <dd className="font-medium text-gray-900">{result.customer?.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-600">Bulan Tagihan</dt>
                    <dd className="font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{result.for_month}</dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-green-200/50 mt-3">
                    <dt className="text-gray-700 font-bold">Total Nominal</dt>
                    <dd className="font-bold text-gray-900">{formatRupiah(result.amount)}</dd>
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
