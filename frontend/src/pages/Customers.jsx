import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { db } from '../db';
import { Plus, Search, WifiOff, Wifi, X, FileDown, Upload } from 'lucide-react';
import { useStore } from '../store';
import * as XLSX from 'xlsx';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', ip_address: '', package_name: '20Mbps', monthly_fee: 150000, active_date: new Date().toISOString().split('T')[0], status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: 'Contoh Pelanggan', phone: '081234567890', ip_address: '192.168.1.100', package_name: '20Mbps', monthly_fee: 150000, active_date: '2026-05-01', status: 'active' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Pelanggan.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });
      
      const parsedData = data.map(row => ({
        name: row.name || '',
        phone: row.phone ? String(row.phone) : '',
        ip_address: row.ip_address || '',
        package_name: row.package_name || '20Mbps',
        monthly_fee: parseInt(row.monthly_fee) || 0,
        active_date: row.active_date || new Date().toISOString().split('T')[0],
        status: row.status || 'active'
      })).filter(row => row.name.trim() !== '');

      setImportData(parsedData);
    };
    reader.readAsBinaryString(file);
  };

  const handleImportSubmit = async () => {
    if (importData.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post('/customers/import', { customers: importData });
      alert(`Import Berhasil! ${res.data.created} data ditambahkan, ${res.data.skipped} data dilewati (ganda).`);
      setShowImportModal(false);
      setImportData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchCustomers();
    } catch (error) {
      alert('Gagal mengimpor data. Pastikan format sudah benar.');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [isOnline]);

  const fetchCustomers = async () => {
    setLoading(true);
    if (isOnline) {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data);
        await db.customers.clear();
        await db.customers.bulkAdd(res.data.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          package_name: c.package_name,
          ip_address: c.ip_address,
          active_date: c.active_date,
          monthly_fee: c.monthly_fee,
          payments_count: c.payments?.length || 0,
          payments: c.payments || []
        })));
      } catch (error) {
        console.error(error);
      }
    } else {
      const cached = await db.customers.toArray();
      setCustomers(cached);
    }
    setLoading(false);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/customers', form);
      setCustomers([...customers, res.data]);
      setShowModal(false);
      setForm({ name: '', phone: '', ip_address: '', package_name: '20Mbps', monthly_fee: 150000, active_date: new Date().toISOString().split('T')[0], status: 'active' });
    } catch (error) {
      alert('Gagal menambah pelanggan');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTunggakan = (customer) => {
    if (!customer.active_date) return 0;

    // Calculate months difference between active_date and current month
    const activeDate = new Date(customer.active_date);
    const currentDate = new Date();

    let monthsDiff = (currentDate.getFullYear() - activeDate.getFullYear()) * 12;
    monthsDiff -= activeDate.getMonth();
    monthsDiff += currentDate.getMonth();

    // Termasuk bulan pertama aktif sebagai tagihan (minimal 1 bulan)
    monthsDiff = monthsDiff < 0 ? 0 : monthsDiff + 1;

    const paidMonths = customer.payments ? customer.payments.length : (customer.payments_count || 0);
    const arrears = monthsDiff - paidMonths;

    return arrears > 0 ? arrears : 0;
  };

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);

  let filtered = customers.filter(c => String(c.name || '').toLowerCase().includes(String(search || '').toLowerCase()));

  filtered.sort((a, b) => {
    const nameA = String(a.name || '');
    const nameB = String(b.name || '');
    if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
    if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
    if (sortBy === 'status') {
      return String(a.status || '').localeCompare(String(b.status || ''));
    }
    if (sortBy === 'tunggakan') {
      return calculateTunggakan(b) - calculateTunggakan(a);
    }
    return 0;
  });

  const activeCount = filtered.filter(c => c.status === 'active').length;
  const inactiveCount = filtered.filter(c => c.status === 'inactive').length;
  const tunggakanCount = filtered.filter(c => calculateTunggakan(c) > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manajemen Pelanggan</h1>
          <p className="text-gray-500 dark:text-gray-400">Kelola data pelanggan WiFi</p>
        </div>
        <div className="flex gap-3">
          <button
            disabled={!isOnline}
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <FileDown size={20} /> Import Excel
          </button>
          <button
            disabled={!isOnline}
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Plus size={20} /> Tambah Pelanggan
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4 transition-colors">
        <div className="relative flex-1 w-full">
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
        
        <select 
          className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700"
          value={sortBy}
          onChange={e => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="name-asc">Urutkan: Nama (A-Z)</option>
          <option value="name-desc">Urutkan: Nama (Z-A)</option>
          <option value="status">Urutkan: Status</option>
          <option value="tunggakan">Urutkan: Tunggakan Terbesar</option>
        </select>

        <div className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${isOnline ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {isOnline ? <><Wifi size={16} /> Online Mode</> : <><WifiOff size={16} /> Offline Mode (Cache)</>}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
              <tr>
                <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Nama ({filtered.length})</th>
                <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Status (Aktif: {activeCount}, Inaktif: {inactiveCount})</th>
                <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Paket & IP</th>
                <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-center">Tagihan (Belum Bayar: {tunggakanCount})</th>
                <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500 dark:text-gray-400">Tidak ada data.</td></tr>
              ) : (
                filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(c => {
                  const tunggakan = calculateTunggakan(c);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-800 dark:text-white">{c.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{c.phone || '-'}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-800 dark:text-gray-200 font-medium">{c.package_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">IP: {c.ip_address || 'Belum diset'}</p>
                      </td>
                      <td className="p-4 text-center">
                        {tunggakan > 0 ? (
                          <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-lg font-bold text-sm">
                            Belum Bayar {tunggakan} Bulan
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-lg font-bold text-sm">
                            Lunas
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Link to={`/customers/${c.id}`} className="text-primary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline">
                          Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })
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

      {/* Modal Tambah Pelanggan */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transition-colors">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tambah Pelanggan Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                <input required type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No HP / WhatsApp</label>
                  <input type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IP Address</label>
                  <input type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paket Internet</label>
                  <input required type="text" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.package_name} onChange={e => setForm({ ...form, package_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tarif Bulanan (Rp)</label>
                  <input required type="number" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.monthly_fee} onChange={e => setForm({ ...form, monthly_fee: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Mulai Aktif (Acuan Tunggakan)</label>
                <input required type="date" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white" value={form.active_date} onChange={e => setForm({ ...form, active_date: e.target.value })} />
              </div>
              <div className="pt-4 border-t dark:border-gray-700 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Batal</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg font-medium text-white bg-primary hover:bg-blue-600 transition-colors disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Simpan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Pelanggan */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden transition-colors flex flex-col max-h-[90vh]">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Import Data Pelanggan</h2>
              <button onClick={() => { setShowImportModal(false); setImportData([]); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <div>
                  <h3 className="font-bold text-blue-800 dark:text-blue-400">Panduan Import</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-300">Unduh template Excel, isi data sesuai format (terutama nama dan active_date), lalu unggah kembali ke sini.</p>
                </div>
                <button onClick={downloadTemplate} className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">
                  Unduh Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unggah File Excel (.xlsx)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                  />
                </div>
              </div>

              {importData.length > 0 && (
                <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-medium text-gray-700 dark:text-gray-300">Preview Data ({importData.length} baris siap diimpor)</p>
                  </div>
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 sticky top-0">
                        <tr>
                          <th className="p-3 font-medium">Nama</th>
                          <th className="p-3 font-medium">Paket</th>
                          <th className="p-3 font-medium">Tarif</th>
                          <th className="p-3 font-medium">Tgl Aktif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {importData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-3 font-medium text-gray-800 dark:text-white">
                              {row.name}
                              {!row.name && <span className="text-red-500 ml-2 text-xs">Kosong!</span>}
                            </td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">{row.package_name}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">{row.monthly_fee}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">{row.active_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 mt-auto">
              <button 
                type="button" 
                onClick={() => { setShowImportModal(false); setImportData([]); if(fileInputRef.current) fileInputRef.current.value = ''; }} 
                className="px-5 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleImportSubmit} 
                disabled={importing || importData.length === 0} 
                className="px-5 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? 'Menyimpan...' : <><Upload size={18} /> Simpan Data</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
