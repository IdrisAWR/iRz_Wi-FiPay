import { useEffect, useState } from 'react';
import api from '../api';
import { Download, Printer, Users, CheckCircle, XCircle, DollarSign, MessageCircle } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); 
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [activeTab, setActiveTab] = useState('bulanan');
  const [bulananTab, setBulananTab] = useState('sudah');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [yearlyData, setYearlyData] = useState([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyCurrentPage, setYearlyCurrentPage] = useState(1);
  const [yearlySearchTerm, setYearlySearchTerm] = useState('');
  const [monthlySearchTerm, setMonthlySearchTerm] = useState('');
  const yearlyItemsPerPage = 20;

  useEffect(() => {
    if (activeTab === 'bulanan') {
      fetchReport();
    } else {
      fetchYearlyReport();
    }
  }, [month, year, activeTab]);

  const fetchYearlyReport = async () => {
    setYearlyLoading(true);
    try {
      const res = await api.get(`/reports/yearly?year=${year}`);
      setYearlyData(res.data.data);
      setYearlyCurrentPage(1);
    } catch (error) {
      console.error(error);
    } finally {
      setYearlyLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/monthly?month=${month}`);
      setReport(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  };

  const handleExport = () => {
    if (!report || report.payments.length === 0) {
      alert("Tidak ada data untuk diekspor bulan ini.");
      return;
    }

    const dataToExport = report.payments.map(p => ({
      'Tanggal': p.payment_date,
      'Pelanggan': p.customer?.name || '-',
      'Paket': p.customer?.package_name || '-',
      'Nominal': p.amount
    }));

    // Add spacing
    dataToExport.push({ 'Tanggal': '', 'Pelanggan': '', 'Paket': '', 'Nominal': '' });
    
    // Add summary rows
    dataToExport.push({ 'Tanggal': 'RINGKASAN', 'Pelanggan': '', 'Paket': '', 'Nominal': '' });
    dataToExport.push({ 'Tanggal': 'Total Pendapatan', 'Pelanggan': '', 'Paket': '', 'Nominal': report.total_pendapatan });
    dataToExport.push({ 'Tanggal': 'Total Pelanggan', 'Pelanggan': '', 'Paket': '', 'Nominal': report.total_customers });
    dataToExport.push({ 'Tanggal': 'Sudah Bayar', 'Pelanggan': '', 'Paket': '', 'Nominal': report.sudah_bayar });
    dataToExport.push({ 'Tanggal': 'Belum Bayar', 'Pelanggan': '', 'Paket': '', 'Nominal': report.belum_bayar });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan_${month}`);
    XLSX.writeFile(wb, `Laporan_iRz_WiFi_${month}.xlsx`);
  };

  const monthsList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

  const renderMatrixCell = (customer, monthStr) => {
    const targetMonth = `${year}-${monthStr}`;
    
    if (customer.paid_months.includes(targetMonth)) {
      return <span className="text-green-500 font-bold text-lg" title="Lunas">✅</span>;
    }

    const targetDateStr = `${targetMonth}-01`;
    const activeDateStr = customer.active_date.substring(0, 7) + '-01';
    if (targetDateStr < activeDateStr) {
      return <span className="text-gray-300 dark:text-gray-600 font-bold">-</span>;
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    if (targetMonth > currentMonth) {
      return <span className="text-gray-300 dark:text-gray-600 font-bold">-</span>;
    }

    return <span className="text-red-500 font-bold text-lg" title="Menunggak">❌</span>;
  };

  const calculateYearlyArrears = (customer) => {
    let arrears = 0;
    const currentMonth = new Date().toISOString().substring(0, 7);
    const activeDateStr = customer.active_date.substring(0, 7) + '-01';

    for (let i = 1; i <= 12; i++) {
      const monthStr = String(i).padStart(2, '0');
      const targetMonth = `${year}-${monthStr}`;
      const targetDateStr = `${targetMonth}-01`;

      if (targetDateStr >= activeDateStr && targetMonth <= currentMonth) {
        if (!customer.paid_months.includes(targetMonth)) {
          arrears++;
        }
      }
    }
    return arrears;
  };

  const getMatrixStatus = (customer, monthStr) => {
    const targetMonth = `${year}-${monthStr}`;
    if (customer.paid_months.includes(targetMonth)) return "Lunas";
    const targetDateStr = `${targetMonth}-01`;
    const activeDateStr = customer.active_date.substring(0, 7) + '-01';
    if (targetDateStr < activeDateStr) return "-";
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (targetMonth > currentMonth) return "-";
    return "Menunggak";
  };

  const handleSendWAMonthly = (customer) => {
    if (!customer.phone) {
      alert(`Nomor telepon untuk pelanggan ${customer.name} belum diisi.`);
      return;
    }

    const [y, m] = month.split('-');
    const monthName = monthNames[parseInt(m, 10) - 1];
    const nominal = formatRupiah(customer.monthly_fee);

    const text = `Terdapat tagihan internet WiFi bulan ${monthName} ${y} yang belum dibayarkan sebesar *${nominal}*.

Mohon untuk segera melakukan pembayaran. Terima kasih! 🙏`;

    const encodedText = encodeURIComponent(text);
    
    let phone = customer.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
  };

  const handleExportYearly = () => {
    if (yearlyData.length === 0) {
      alert("Tidak ada data untuk diekspor pada tahun ini.");
      return;
    }

    const dataToExport = yearlyData.map(c => {
      const arrears = calculateYearlyArrears(c);
      const row = {
        'Pelanggan': c.name,
      };
      
      monthsList.forEach((m, idx) => {
        row[monthNames[idx]] = getMatrixStatus(c, m);
      });

      row['Total Tunggakan'] = arrears > 0 ? `${arrears} bln` : 'Lunas';
      row['Nominal Tunggakan'] = arrears > 0 ? arrears * c.monthly_fee : 0;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Tahunan_${year}`);
    XLSX.writeFile(wb, `Laporan_Tahunan_iRz_WiFi_${year}.xlsx`);
  };

  const handleSendWA = (customer, arrears) => {
    if (!customer.phone) {
      alert(`Nomor telepon untuk pelanggan ${customer.name} belum diisi.`);
      return;
    }

    const unpaidMonths = [];
    const currentMonth = new Date().toISOString().substring(0, 7);
    const activeDateStr = customer.active_date.substring(0, 7) + '-01';

    for (let i = 1; i <= 12; i++) {
      const monthStr = String(i).padStart(2, '0');
      const targetMonth = `${year}-${monthStr}`;
      const targetDateStr = `${targetMonth}-01`;

      if (targetDateStr >= activeDateStr && targetMonth <= currentMonth) {
        if (!customer.paid_months.includes(targetMonth)) {
          unpaidMonths.push(monthNames[i-1]);
        }
      }
    }

    const totalNominal = formatRupiah(arrears * customer.monthly_fee);
    const listBulan = unpaidMonths.join(', ');
    const currentMonthStr = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const text = `Halo Kak ${customer.name}, ini adalah pesan dari admin iRz Wi-Fi.

Terdapat tagihan internet WiFi bulan ${currentMonthStr} yang belum dibayarkan sebanyak ${arrears} bulan (${listBulan} ${year}) dengan total tagihan sebesar *${totalNominal}*.

Mohon untuk segera melakukan pembayaran agar koneksi internet tetap lancar. Terima kasih! 🙏`;

    const encodedText = encodeURIComponent(text);
    
    let phone = customer.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
  };

  const filteredYearlyData = yearlyData.filter(c => 
    c.name.toLowerCase().includes(yearlySearchTerm.toLowerCase())
  );

  const yearlyTotalPages = Math.ceil(filteredYearlyData.length / yearlyItemsPerPage);
  const paginatedYearlyData = filteredYearlyData.slice(
    (yearlyCurrentPage - 1) * yearlyItemsPerPage,
    yearlyCurrentPage * yearlyItemsPerPage
  );

  const filteredPayments = report?.payments?.filter(p => 
    p.customer?.name?.toLowerCase().includes(monthlySearchTerm.toLowerCase())
  ) || [];

  const filteredUnpaidCustomers = report?.unpaid_customers?.filter(c =>
    c.name?.toLowerCase().includes(monthlySearchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Laporan Keuangan</h1>
          <p className="text-gray-500 dark:text-gray-400">Rekap pembayaran pelanggan WiFi</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('bulanan')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'bulanan' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            Bulanan
          </button>
          <button 
            onClick={() => setActiveTab('tahunan')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tahunan' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            Tahunan
          </button>
        </div>
      </div>
      {activeTab === 'bulanan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
            <input
              type="text"
              placeholder="Cari nama pelanggan..."
              value={monthlySearchTerm}
              onChange={(e) => setMonthlySearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white max-w-md"
            />
            <div className="flex justify-end gap-4">
              <input 
                type="month" 
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
              <button onClick={handleExport} className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                <Download size={20} /> Export Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading data...</div>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400">
                <Users size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 truncate">Total Pelanggan</p>
                <p className="text-xl xl:text-2xl font-bold text-gray-800 dark:text-white truncate">{report.total_customers}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400">
                <CheckCircle size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 truncate">Sudah Bayar</p>
                <p className="text-xl xl:text-2xl font-bold text-gray-800 dark:text-white truncate">{report.sudah_bayar}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400">
                <XCircle size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 truncate">Belum Bayar</p>
                <p className="text-xl xl:text-2xl font-bold text-gray-800 dark:text-white truncate">{report.belum_bayar}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400">
                <DollarSign size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 truncate">Total Pendapatan</p>
                <p className="text-xl xl:text-2xl font-bold text-gray-800 dark:text-white truncate" title={formatRupiah(report.total_pendapatan)}>{formatRupiah(report.total_pendapatan)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="flex border-b border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => setBulananTab('sudah')}
                className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${bulananTab === 'sudah' ? 'text-primary dark:text-blue-400 border-b-2 border-primary dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              >
                Sudah Bayar ({report.sudah_bayar})
              </button>
              <button 
                onClick={() => setBulananTab('belum')}
                className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${bulananTab === 'belum' ? 'text-red-500 dark:text-red-400 border-b-2 border-red-500 dark:border-red-400 bg-red-50/50 dark:bg-red-900/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              >
                Belum Bayar ({report.belum_bayar})
              </button>
            </div>
            
            <div className="overflow-x-auto">
              {bulananTab === 'sudah' ? (
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                    <tr>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Tanggal</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Pelanggan</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Nominal</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-center">Cetak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredPayments.length === 0 ? (
                      <tr><td colSpan="4" className="p-4 text-center text-gray-500 dark:text-gray-400">Belum ada pembayaran di bulan ini atau tidak ada hasil pencarian</td></tr>
                    ) : (
                      filteredPayments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="p-4 text-gray-800 dark:text-gray-200">{p.payment_date}</td>
                          <td className="p-4 text-gray-800 dark:text-white font-medium">{p.customer?.name}</td>
                          <td className="p-4 text-green-600 dark:text-green-400 font-medium">{formatRupiah(p.amount)}</td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => setReceiptData({ ...p, customerName: p.customer?.name })}
                              className="text-primary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 p-2 rounded-lg transition-colors"
                              title="Cetak Nota"
                            >
                              <Printer size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                    <tr>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Pelanggan</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">No. HP</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Tagihan</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredUnpaidCustomers.length === 0 ? (
                      <tr><td colSpan="4" className="p-4 text-center text-gray-500 dark:text-gray-400">Semua pelanggan aktif sudah membayar bulan ini atau tidak ada hasil pencarian</td></tr>
                    ) : (
                      filteredUnpaidCustomers.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="p-4 text-gray-800 dark:text-white font-medium">{c.name}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-300">{c.phone || '-'}</td>
                          <td className="p-4 text-red-600 dark:text-red-400 font-medium">{formatRupiah(c.monthly_fee)}</td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => handleSendWAMonthly(c)}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 p-2 rounded-lg transition-colors flex items-center justify-center mx-auto gap-2 text-sm font-medium"
                              title="Kirim Tagihan WA"
                            >
                              <MessageCircle size={16} /> WA
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
          ) : null}
        </div>
      )}

      {activeTab === 'tahunan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
            <input
              type="text"
              placeholder="Cari nama pelanggan..."
              value={yearlySearchTerm}
              onChange={(e) => {
                setYearlySearchTerm(e.target.value);
                setYearlyCurrentPage(1);
              }}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white max-w-md"
            />
            <div className="flex justify-end gap-4">
              <input 
                type="number" 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white w-32"
                min="2020" max="2100"
              />
              <button onClick={handleExportYearly} className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                <Download size={20} /> Export Excel
              </button>
            </div>
          </div>
          
          {yearlyLoading ? (
            <div className="text-center py-12 text-gray-500">Loading data...</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Pelanggan</th>
                      {monthNames.map(m => (
                        <th key={m} className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-center">{m}</th>
                      ))}
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-right">Total Tunggakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedYearlyData.length === 0 ? (
                      <tr><td colSpan="14" className="p-4 text-center text-gray-500 dark:text-gray-400">Tidak ada data pelanggan aktif</td></tr>
                    ) : (
                      paginatedYearlyData.map(c => {
                        const arrears = calculateYearlyArrears(c);
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="p-4 text-gray-800 dark:text-white font-medium">{c.name}</td>
                            {monthsList.map(m => (
                              <td key={m} className="p-4 text-center">
                                {renderMatrixCell(c, m)}
                              </td>
                            ))}
                            <td className="p-4 text-right">
                              {arrears > 0 ? (
                                <div className="flex items-center justify-end gap-3">
                                  <span className="text-red-600 font-bold">{arrears} bln ({formatRupiah(arrears * c.monthly_fee)})</span>
                                  <button
                                    onClick={() => handleSendWA(c, arrears)}
                                    className="p-1.5 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors"
                                    title="Kirim Tagihan via WA"
                                  >
                                    <MessageCircle size={18} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-green-600 font-medium flex items-center justify-end gap-1"><CheckCircle size={14}/> Lunas</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {yearlyTotalPages > 1 && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Halaman {yearlyCurrentPage} dari {yearlyTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setYearlyCurrentPage(p => Math.max(1, p - 1))}
                      disabled={yearlyCurrentPage === 1}
                      className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Sebelumnya
                    </button>
                    <button 
                      onClick={() => setYearlyCurrentPage(p => Math.min(yearlyTotalPages, p + 1))}
                      disabled={yearlyCurrentPage === yearlyTotalPages}
                      className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <ReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  );
}
