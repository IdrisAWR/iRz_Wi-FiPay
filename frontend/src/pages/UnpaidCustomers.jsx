import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { db } from '../db';
import { Search, AlertCircle, ArrowRight, CheckCircle, MessageCircle } from 'lucide-react';

export default function UnpaidCustomers() {
  const [unpaidCustomers, setUnpaidCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    fetchUnpaid();
  }, []);

  const fetchUnpaid = async () => {
    setLoading(true);
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    let allCustomers = [];
    
    if (navigator.onLine) {
      try {
        const res = await api.get('/customers');
        allCustomers = res.data;
      } catch (e) {
        allCustomers = await db.customers.toArray();
      }
    } else {
      allCustomers = await db.customers.toArray();
    }
    
    // Filter out inactive customers
    const activeCustomers = allCustomers.filter(c => c.status === 'active');
    
    // Check if they paid for this month
    const unpaid = activeCustomers.filter(c => {
      // Jika tidak ada data array payments (offline tanpa detail), anggap belum bayar agar aman
      if (!c.payments) return true; 
      // Jika ada, periksa apakah bulan ini sudah ada di dalam array payments
      return !c.payments.some(p => p.for_month === currentMonth);
    });
    
    setUnpaidCustomers(unpaid);
    setLoading(false);
  };

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);

  const handleSendWA = (customer) => {
    if (!customer.phone) {
      alert(`Nomor telepon untuk pelanggan ${customer.name} belum diisi.`);
      return;
    }

    const currentMonthStr = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const totalNominal = formatRupiah(customer.monthly_fee);

    const text = `Halo Kak ${customer.name}, ini adalah pesan dari admin iRz Wi-Fi.

Terdapat tagihan internet WiFi bulan ${currentMonthStr} yang belum dibayarkan sebesar *${totalNominal}*.

Mohon untuk segera melakukan pembayaran agar koneksi internet tetap lancar. Terima kasih! 🙏`;

    const encodedText = encodeURIComponent(text);
    
    let phone = customer.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
  };

  const filtered = unpaidCustomers.filter(c => String(c.name || '').toLowerCase().includes(String(search || '').toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Pelanggan Belum Bayar</h1>
          <p className="text-gray-500 dark:text-gray-400">Daftar pelanggan aktif yang belum melunasi tagihan bulan ini</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama pelanggan..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
              <tr>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50">Nama Pelanggan</th>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50">Paket & Kontak</th>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50">Tagihan Bulan Ini</th>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="4" className="p-4 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle size={48} className="text-green-300 dark:text-green-600 mb-4" />
                      <p className="text-lg font-medium text-gray-800 dark:text-white">Luar biasa!</p>
                      <p>Semua pelanggan aktif sudah membayar tagihan bulan ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(c => (
                  <tr key={c.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full text-red-500 dark:text-red-400">
                          <AlertCircle size={20} />
                        </div>
                        <p className="font-bold text-gray-800 dark:text-white">{c.name}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{c.package_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{c.phone || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                        {formatRupiah(c.monthly_fee)}
                      </p>
                    </td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleSendWA(c)}
                        className="bg-green-100 text-green-600 hover:bg-green-600 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        title="Kirim Tagihan via WA"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <Link 
                        to={`/customers/${c.id}`} 
                        className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Detail
                      </Link>
                      <Link 
                        to="/payments" 
                        className="bg-primary text-white hover:bg-blue-600 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        Catat Bayar <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination UI */}
        {filtered.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} dari {filtered.length} data
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filtered.length / itemsPerPage)))}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
