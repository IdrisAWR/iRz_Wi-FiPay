import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, User, MapPin, Calendar, CreditCard, DollarSign, Activity, Edit, Trash2, X, Printer } from 'lucide-react';
import { db } from '../db';
import ReceiptModal from '../components/ReceiptModal';
import { Skeleton, RowsSkeleton } from '../components/Skeleton';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
      setForm(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Yakin ingin menghapus pelanggan ini? Data tidak dapat dikembalikan.')) {
      try {
        await api.delete(`/customers/${id}`);
        // Hapus dari cache juga
        await db.customers.delete(Number(id));
        alert('Pelanggan berhasil dihapus');
        navigate('/customers');
      } catch (error) {
        alert('Gagal menghapus pelanggan. Mungkin ada data pembayaran yang terkait.');
      }
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Yakin ingin menghapus histori pembayaran ini? Data tidak dapat dikembalikan.')) {
      try {
        await api.delete(`/payments/${paymentId}`);
        setCustomer({
          ...customer,
          payments: customer.payments.filter(p => p.id !== paymentId)
        });
        alert('Histori pembayaran berhasil dihapus');
      } catch (error) {
        alert('Gagal menghapus histori pembayaran.');
      }
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put(`/customers/${id}`, form);
      setCustomer(res.data);
      setShowEditModal(false);
      alert('Data pelanggan berhasil diperbarui');
    } catch (error) {
      alert('Gagal memperbarui pelanggan');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);

  if (loading) return (
    <div role="status" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <span className="sr-only">Memuat data pelanggan</span>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <Skeleton className="h-6 w-2/3" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
      <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full"><tbody><RowsSkeleton colSpan={1} rows={6} /></tbody></table>
      </div>
    </div>
  );
  if (!customer) return <div className="text-center py-12 text-gray-500">Pelanggan tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link to="/customers" aria-label="Kembali ke daftar pelanggan" className="grid place-items-center size-11 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Detail Pelanggan</h1>
            <p className="text-gray-500 dark:text-gray-400">Informasi lengkap dan histori pembayaran</p>
          </div>
        </div>
        
        {navigator.onLine && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowEditModal(true)}
              className="flex-1 sm:flex-none justify-center bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Edit size={18} /> Edit
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 sm:flex-none justify-center bg-red-100 text-red-800 hover:bg-red-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Trash2 size={18} /> Hapus
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-primary dark:text-blue-400 rounded-full flex items-center justify-center">
                <User size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{customer.name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${customer.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {customer.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-gray-400 dark:text-gray-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">IP Address</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold">{customer.ip_address || 'Belum diatur'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={20} className="text-gray-400 dark:text-gray-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tanggal Mulai Aktif</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold">{customer.active_date}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity size={20} className="text-gray-400 dark:text-gray-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Paket Internet</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold">{customer.package_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign size={20} className="text-gray-400 dark:text-gray-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tarif Bulanan</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold">{formatRupiah(customer.monthly_fee)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <CreditCard size={20} className="text-primary dark:text-blue-400" /> Histori Pembayaran
              </h3>
            </div>
            {customer.payments && customer.payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table-stack w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                    <tr>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Bulan Tagihan</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Tanggal Bayar</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Nominal</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {customer.payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td data-primary className="p-4 font-semibold text-gray-900 dark:text-white">{p.for_month}</td>
                        <td data-label="Tanggal bayar" className="p-4 text-gray-700 dark:text-gray-300">{p.payment_date}</td>
                        <td data-label="Nominal" className="p-4 text-green-800 dark:text-green-400 font-medium">{formatRupiah(p.amount)}</td>
                        <td data-actions className="p-4">
                          <div className="flex items-center justify-end gap-2 w-full">
                            <button 
                              onClick={() => setReceiptData({ ...p, customerName: customer.name, customerPhone: customer.phone })}
                              className="text-primary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 p-2 rounded-lg transition-colors"
                              title="Cetak nota" aria-label="Cetak nota"
                            >
                              <Printer size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeletePayment(p.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 p-2 rounded-lg transition-colors"
                              title="Hapus histori" aria-label="Hapus histori pembayaran"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                <p>Belum ada pembayaran untuk pelanggan ini.</p>
              </div>
            )}
            
            {customer.payments && customer.payments.length > itemsPerPage && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, customer.payments.length)} dari {customer.payments.length} data
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
                    disabled={currentPage === Math.ceil(customer.payments.length / itemsPerPage)}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(customer.payments.length / itemsPerPage)))}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg modal-panel overflow-hidden transition-colors max-h-[90vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Edit Pelanggan</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                <input required type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No HP / WhatsApp</label>
                  <input type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IP Address</label>
                  <input type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.ip_address || ''} onChange={e => setForm({...form, ip_address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paket Internet</label>
                  <input required type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.package_name} onChange={e => setForm({...form, package_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tarif Bulanan (Rp)</label>
                  <input required type="number" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.monthly_fee} onChange={e => setForm({...form, monthly_fee: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Mulai Aktif</label>
                  <input required type="date" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.active_date} onChange={e => setForm({...form, active_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select required className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t dark:border-gray-700 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Batal</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg font-medium text-white bg-primary hover:bg-[#014a85] transition-colors disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  );
}
