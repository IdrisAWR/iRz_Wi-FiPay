import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { db } from '../db';
import { Search, MessageCircle } from 'lucide-react';
import { RowsSkeleton } from '../components/Skeleton';

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
    
    const activeCustomers = allCustomers.filter(c => c.status === 'active');
    
    const unpaid = activeCustomers.filter(c => {
      // Jika tidak ada data array payments (offline tanpa detail), anggap belum bayar agar aman
      if (!c.payments) return true; 
      return !c.payments.some(p => p.for_month === currentMonth);
    });
    
    setUnpaidCustomers(unpaid);
    setLoading(false);
  };

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  const formatBulan = (bulan) => {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const [year, month] = bulan.split('-');
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const handleSendWA = (customer) => {
    if (!customer.phone) {
      alert(`Nomor telepon untuk pelanggan ${customer.name} belum diisi.`);
      return;
    }

    const totalNominal = formatRupiah(customer.monthly_fee);
    const currentMonth = new Date().toISOString().substring(0, 7);
    const month = formatBulan(currentMonth);

    const text = `Mohon untuk segera melakukan pembayaran WiFi bulan ${month} yang belum dibayarkan sebesar *${totalNominal}* Terimakasih??
*INFORMASI:* 
WiFi akan otomatis OFF/MATI apabila tidak ada konfirmasi lebih lanjut dan ada tunggakan lebih dari 2 bulan, Terimakasih.

Pembayaran via transfer bisa ke
BCA : 1234567890
an. wertyui`;

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pelanggan Belum Bayar</h1>
          <p className="text-gray-500 dark:text-gray-400">Daftar pelanggan aktif yang belum melunasi tagihan bulan ini</p>
        </div>
      </div>

      <div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama pelanggan..." 
            aria-label="Cari nama pelanggan"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
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
          <table className="table-stack w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm">
              <tr>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50">Nama Pelanggan</th>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50">Paket & Kontak</th>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50">Tagihan Bulan Ini</th>
                <th className="p-4 font-medium border-b border-red-100 dark:border-red-900/50 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <RowsSkeleton colSpan={4} label="Memuat daftar" />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-gray-500 dark:text-gray-400">
                    <p className="font-medium text-gray-900 dark:text-white">Tidak ada tunggakan bulan ini.</p>
                    <p>Semua pelanggan aktif sudah membayar.</p>
                  </td>
                </tr>
              ) : (
                filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(c => (
                  <tr key={c.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors">
                    <td data-primary className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                    </td>
                    <td data-label="Paket" className="p-4">
                      <p className="text-gray-900 dark:text-gray-200 font-medium">{c.package_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{c.phone || '-'}</p>
                    </td>
                    <td data-label="Tagihan" className="p-4">
                      <p className="text-red-700 dark:text-red-400 font-bold flex items-center gap-1">
                        {formatRupiah(c.monthly_fee)}
                      </p>
                    </td>
                    <td data-actions className="p-4"><div className="flex justify-end gap-2 w-full">
                      <button
                        onClick={() => handleSendWA(c)}
                        className="grid place-items-center bg-green-100 text-green-800 hover:bg-green-700 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        title="Kirim tagihan via WhatsApp" aria-label="Kirim tagihan via WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <Link 
                        to={`/customers/${c.id}`} 
                        className="grid place-items-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Detail
                      </Link>
                      <Link 
                        to="/payments" 
                        className="bg-primary text-white hover:bg-[#014a85] px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                      >
                        Catat bayar
                      </Link>
                    </div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
