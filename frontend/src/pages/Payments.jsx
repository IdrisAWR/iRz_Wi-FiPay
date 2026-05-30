import { useEffect, useState, useRef } from 'react';
import api from '../api';
import { db } from '../db';
import { useStore } from '../store';
import { CheckCircle, Clock } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';

export default function Payments() {
  const [customers, setCustomers] = useState([]);
  const [pendingSync, setPendingSync] = useState([]);
  const [loading, setLoading] = useState(false);
  const isOnline = useStore(state => state.isOnline) || navigator.onLine;
  const { setSyncing } = useStore();
  const [receiptData, setReceiptData] = useState(null);
  const [minMonth, setMinMonth] = useState('');

  const [form, setForm] = useState({
    customer_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    for_month: '',
    amount: ''
  });
  const [monthsToPay, setMonthsToPay] = useState(1);
  const [searchCust, setSearchCust] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateTunggakan = (customer) => {
    if (!customer.active_date) return 0;
    const activeDate = new Date(customer.active_date);
    const currentDate = new Date();
    let monthsDiff = (currentDate.getFullYear() - activeDate.getFullYear()) * 12;
    monthsDiff -= activeDate.getMonth();
    monthsDiff += currentDate.getMonth();
    monthsDiff = monthsDiff < 0 ? 0 : monthsDiff + 1;
    const paidMonths = customer.payments ? customer.payments.length : (customer.payments_count || 0);
    const arrears = monthsDiff - paidMonths;
    return arrears > 0 ? arrears : 0;
  };

  const getFirstUnpaidMonth = (customer) => {
    if (!customer.active_date) return '';
    const activeDate = new Date(customer.active_date);
    const currentDate = new Date();
    
    let current = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const paidMonths = customer.payments ? customer.payments.map(p => p.for_month) : [];
    
    while (current <= end) {
      const monthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      if (!paidMonths.includes(monthStr)) {
        return monthStr;
      }
      current.setMonth(current.getMonth() + 1);
    }
    
    current = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
  };

  useEffect(() => {
    loadCustomers();
    loadPendingSync();
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && pendingSync.length > 0) {
      syncOfflineData();
    }
  }, [isOnline, pendingSync.length]);

  const loadCustomers = async () => {
    let data = [];
    if (isOnline) {
      try {
        const res = await api.get('/customers');
        data = res.data;
      } catch (e) {
        data = await db.customers.toArray();
      }
    } else {
      data = await db.customers.toArray();
    }
    // Hanya tampilkan pelanggan yang aktif
    setCustomers(data.filter(c => c.status === 'active'));
  };

  const loadPendingSync = async () => {
    const queue = await db.syncQueue.toArray();
    setPendingSync(queue);
  };

  const syncOfflineData = async () => {
    const queue = await db.syncQueue.toArray();
    if (queue.length === 0) return;
    
    setSyncing(true);
    try {
      await api.post('/payments/sync', { payments: queue });
      await db.syncQueue.clear();
      setPendingSync([]);
      alert("Data offline berhasil disinkronisasi ke server!");
    } catch (error) {
      console.error("Gagal sinkronisasi data", error);
    } finally {
      setSyncing(false);
    }
  };

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);

  const generateMonths = (startMonth, count) => {
    if (!startMonth) return [];
    let [year, month] = startMonth.split('-').map(Number);
    const months = [];
    for (let i = 0; i < count; i++) {
        months.push(`${year}-${String(month).padStart(2, '0')}`);
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }
    return months;
  };

  const generatePaymentCode = () => {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `IRW-${dateStr}-${randomStr}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const selectedCust = customers.find(c => c.id == form.customer_id);
    const monthsList = generateMonths(form.for_month, monthsToPay);
    
    const paymentsToSubmit = monthsList.map(monthStr => ({
        customer_id: form.customer_id,
        payment_date: form.payment_date,
        for_month: monthStr,
        amount: selectedCust?.monthly_fee || 0,
        payment_code: generatePaymentCode()
    }));

    const totalAmount = (selectedCust?.monthly_fee || 0) * monthsToPay;
    const forMonthLabel = monthsToPay > 1 ? `${monthsList[0]} s/d ${monthsList[monthsList.length - 1]}` : monthsList[0];
    
    const paymentRecord = { 
        ...form, 
        customerName: selectedCust?.name,
        amount: totalAmount,
        for_month: forMonthLabel,
        payment_code: paymentsToSubmit[0].payment_code // We can use the first code for the combined receipt
    };

    if (isOnline) {
      try {
        if (monthsToPay > 1) {
             await api.post('/payments/sync', { payments: paymentsToSubmit });
        } else {
             await api.post('/payments', paymentsToSubmit[0]);
        }
        setReceiptData(paymentRecord); // Munculkan nota
        setForm({...form, amount: '', customer_id: ''});
        setMonthsToPay(1);
        setSearchCust('');
        loadCustomers(); // Segarkan data agar status 'Lunas' ter-update
      } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.message) {
          alert(error.response.data.message);
        } else {
          alert('Gagal mencatat pembayaran');
        }
      }
    } else {
      for (const p of paymentsToSubmit) {
          await db.syncQueue.add(p);
      }
      setReceiptData(paymentRecord); // Munculkan nota walau offline
      setForm({...form, amount: '', customer_id: ''});
      setMonthsToPay(1);
      setSearchCust('');
      loadPendingSync();
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedCustForValidation = customers.find(c => c.id == form.customer_id);
  const isAlreadyPaid = form.customer_id && form.for_month && (
    (selectedCustForValidation?.payments?.some(p => p.for_month === form.for_month)) ||
    (pendingSync.some(p => p.customer_id == form.customer_id && p.for_month === form.for_month))
  );

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Catat Pembayaran</h1>
        <p className="text-gray-500 dark:text-gray-400">Input pembayaran pelanggan WiFi (Hanya pelanggan aktif)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pelanggan</label>
              <div className="relative" ref={dropdownRef}>
                <input 
                  type="text" 
                  required={!form.customer_id}
                  placeholder="Ketik nama pelanggan untuk mencari..."
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  value={searchCust}
                  onChange={e => {
                    setSearchCust(e.target.value);
                    setShowDropdown(true);
                    if (form.customer_id) {
                       setForm({...form, customer_id: ''});
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customers.filter(c => c.name.toLowerCase().includes(searchCust.toLowerCase())).map(c => (
                      <div 
                        key={c.id} 
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-0"
                        onClick={() => {
                          const custId = c.id;
                          const selectedCust = c;
                          
                          let newForMonth = '';
                          let initialMonthsToPay = 1;

                          if (selectedCust) {
                             const tunggakan = calculateTunggakan(selectedCust);
                             initialMonthsToPay = tunggakan > 0 ? tunggakan : 1;
                             newForMonth = getFirstUnpaidMonth(selectedCust);
                          }

                          const activeMonth = selectedCust && selectedCust.active_date 
                            ? selectedCust.active_date.substring(0, 7) 
                            : '';
                          
                          if (!newForMonth && activeMonth) {
                            newForMonth = activeMonth;
                          }

                          setMinMonth(activeMonth);
                          setMonthsToPay(initialMonthsToPay);
                          setForm({
                            ...form, 
                            customer_id: custId, 
                            amount: selectedCust ? selectedCust.monthly_fee : '',
                            for_month: newForMonth
                          });
                          
                          setSearchCust(c.name);
                          setShowDropdown(false);
                        }}
                      >
                        <div className="font-medium text-gray-800 dark:text-white">{c.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{c.package_name} - {c.ip_address || 'Tanpa IP'}</div>
                      </div>
                    ))}
                    {customers.filter(c => c.name.toLowerCase().includes(searchCust.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">Pelanggan tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal Bayar</label>
                <input 
                  type="date" required
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  value={form.payment_date}
                  onChange={e => setForm({...form, payment_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mulai Bulan Tagihan</label>
                <input 
                  type="month" required
                  min={minMonth}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  value={form.for_month}
                  onChange={e => setForm({...form, for_month: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Berapa Bulan?</label>
                <input 
                  type="number" required min="1" max="24"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  value={monthsToPay}
                  onChange={e => setMonthsToPay(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Nominal (Rp)</label>
                <input 
                  type="number" required min="0" readOnly
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 focus:outline-none text-gray-600 dark:text-gray-300 font-bold"
                  value={(selectedCustForValidation?.monthly_fee || 0) * monthsToPay || ''}
                  placeholder="Pilih pelanggan terlebih dahulu..."
                />
              </div>
            </div>

            {isAlreadyPaid && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span className="font-bold">Perhatian:</span> Tagihan untuk pelanggan ini pada bulan yang dipilih sudah dilunasi! Tidak dapat membayar ulang.
              </div>
            )}

            <button disabled={loading || isAlreadyPaid || !form.customer_id} type="submit" className="w-full bg-primary hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <CheckCircle size={20} /> Simpan & Buat Nota
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-6 border border-orange-100 dark:border-orange-800 transition-colors">
            <h3 className="text-lg font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2 mb-4">
              <Clock size={20} /> Antrian Sinkronisasi Offline
            </h3>
            {pendingSync.length === 0 ? (
              <p className="text-orange-600 dark:text-orange-500 text-sm">Tidak ada antrian offline. Semua data tersinkron.</p>
            ) : (
              <ul className="space-y-3">
                {pendingSync.map((item, idx) => {
                  const customer = customers.find(c => c.id == item.customer_id);
                  return (
                    <li key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-transparent dark:border-gray-700 text-sm flex justify-between items-center transition-colors">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{customer ? customer.name : `ID: ${item.customer_id}`}</p>
                        <p className="text-gray-500 dark:text-gray-400">Rp {item.amount} • {item.for_month}</p>
                      </div>
                      <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-2 py-1 rounded text-xs font-medium">Pending</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Gunakan komponen ReceiptModal yang baru dan modern */}
      <ReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  );
}
