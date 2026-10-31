import { useEffect, useState } from 'react';
import api from '../api';
import { Download, Printer, CheckCircle, XCircle, MessageCircle, CloudUpload, ExternalLink, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { CardsSkeleton, RowsSkeleton } from '../components/Skeleton';
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
  const [waModalData, setWaModalData] = useState(null);
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [driveStatus, setDriveStatus] = useState(null);
  const [driveResult, setDriveResult] = useState(null);
  const yearlyItemsPerPage = 20;

  useEffect(() => {
    fetchDriveStatus();
  }, []);

  const fetchDriveStatus = async () => {
    try {
      const res = await api.get('/reports/drive-status');
      setDriveStatus(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    setDriveResult(null);
    try {
      const res = await api.post('/reports/sync-sheets');
      setDriveResult({
        isError: false,
        message: res.data.message || 'Semua transaksi berhasil disinkronkan ke Google Spreadsheet!',
        link: res.data.spreadsheet_link
      });
      fetchDriveStatus();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Gagal menyinkronkan data ke Google Sheets.';
      setDriveResult({
        isError: true,
        message: msg
      });
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleUploadDrive = async () => {
    setUploadingDrive(true);
    setDriveResult(null);
    try {
      const res = await api.post('/reports/upload-drive', { month });
      setDriveResult({
        isError: false,
        message: res.data.message || `Laporan ${month} berhasil diunggah ke Google Drive!`,
        link: res.data.data?.view_link
      });
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Gagal mengunggah laporan ke Google Drive.';
      setDriveResult({
        isError: true,
        message: msg
      });
    } finally {
      setUploadingDrive(false);
    }
  };

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
  const formatBulan = (bulan) => {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const [year, month] = bulan.split('-');
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
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

    dataToExport.push({ 'Tanggal': '', 'Pelanggan': '', 'Paket': '', 'Nominal': '' });
    
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
      return <CheckCircle2 size={18} className="inline text-green-700 dark:text-green-400" aria-label="Lunas" />;
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

    const formattedMonth = formatBulan(month);
    const totalNominal = formatRupiah(customer.monthly_fee);

    const text = `Mohon untuk segera melakukan pembayaran WiFi bulan ${formattedMonth} yang belum dibayarkan sebesar *${totalNominal}* Terimakasih🙏
*INFORMASI:* 
WiFi akan otomatis OFF/MATI apabila tidak ada konfirmasi lebih lanjut dan ada tunggakan lebih dari 2 bulan, Terimakasih.

Pembayaran via transfer bisa ke
BCA : 8940485445
an. Nur asih apriliana`;

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

  const openWaModal = (customer) => {
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
          unpaidMonths.push({
            name: monthNames[i-1],
            targetMonth
          });
        }
      }
    }

    if (unpaidMonths.length === 0) {
      alert('Tidak ada tunggakan untuk pelanggan ini di tahun ini.');
      return;
    }

    setWaModalData({
      customer,
      unpaidMonths,
      selectedMonths: unpaidMonths.map(m => m.targetMonth)
    });
  };

  const handleSendWASelected = () => {
    if (!waModalData) return;
    const { customer, unpaidMonths, selectedMonths } = waModalData;
    
    const selectedMonthNames = selectedMonths.sort().map(m => formatBulan(m)).join(', ');
    const totalNominal = formatRupiah(selectedMonths.length * customer.monthly_fee);
    
    const text = `Mohon untuk segera melakukan pembayaran WiFi bulan ${selectedMonthNames} yang belum dibayarkan sebesar *${totalNominal}* Terimakasih🙏
*INFORMASI:* 
WiFi akan otomatis OFF/MATI apabila tidak ada konfirmasi lebih lanjut dan ada tunggakan lebih dari 2 bulan, Terimakasih.

Pembayaran via transfer bisa ke
BCA : 1234567890
an. qwertyuio`;

    const encodedText = encodeURIComponent(text);
    
    let phone = customer.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    setWaModalData(null);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan Keuangan</h1>
          <p className="text-gray-500 dark:text-gray-400">Rekap pembayaran pelanggan WiFi</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('bulanan')}
            aria-pressed={activeTab === 'bulanan'} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'bulanan' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
          >
            Bulanan
          </button>
          <button 
            onClick={() => setActiveTab('tahunan')}
            aria-pressed={activeTab === 'tahunan'} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tahunan' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
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
              placeholder="Cari nama pelanggan"
              value={monthlySearchTerm}
              onChange={(e) => setMonthlySearchTerm(e.target.value)}
              aria-label="Cari nama pelanggan" className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white sm:max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              <input 
                type="month" 
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label="Bulan laporan" className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <button onClick={handleExport} className="bg-primary hover:bg-[#014a85] text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                <Download size={18} /> Export Excel
              </button>
              <button 
                onClick={handleSyncSheets} 
                disabled={syncingSheets} 
                className="border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                title="Sinkronkan seluruh transaksi real-time ke Google Spreadsheet"
              >
                {syncingSheets ? <RefreshCw className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                {syncingSheets ? 'Menyinkronkan…' : 'Sync ke Google Sheet'}
              </button>
              {driveStatus?.spreadsheet_link && (
                <a
                  href={driveStatus.spreadsheet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  title="Buka Google Spreadsheet di tab baru"
                >
                  <ExternalLink size={18} /> Buka Sheet
                </a>
              )}
            </div>
          </div>

          {driveResult && (
            <div className={`p-4 rounded-xl flex items-center justify-between gap-3 ${driveResult.isError ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'}`}>
              <div className="flex items-center gap-3">
                {driveResult.isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                <span className="font-medium text-sm">{driveResult.message}</span>
              </div>
              {driveResult.link && (
                <a 
                  href={driveResult.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-sm font-semibold underline hover:no-underline"
                >
                  Lihat di Drive <ExternalLink size={16} />
                </a>
              )}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <CardsSkeleton label="Memuat laporan" />
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <table className="w-full"><tbody><RowsSkeleton colSpan={1} /></tbody></table>
              </div>
            </div>
      ) : report ? (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Total pelanggan', report.total_customers, ''],
              ['Sudah bayar', report.sudah_bayar, ''],
              ['Belum bayar', report.belum_bayar, 'text-red-700 dark:text-red-400'],
              ['Total pendapatan', formatRupiah(report.total_pendapatan), 'col-span-2 lg:col-span-1'],
            ].map(([label, value, extra]) => (
              <div key={label} className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${extra.startsWith('col') ? extra : ''}`}>
                <dt className="text-sm text-gray-600 dark:text-gray-400">{label}</dt>
                <dd className={`text-xl md:text-2xl font-bold mt-1 break-words ${extra.startsWith('text') ? extra : 'text-gray-900 dark:text-white'}`}>{value}</dd>
              </div>
            ))}
          </dl>

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
                <table className="table-stack w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm">
                    <tr>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Pelanggan</th>
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700">Tanggal</th>
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
                          <td data-primary className="p-4 text-gray-900 dark:text-white font-semibold">{p.customer?.name}</td>
                          <td data-label="Tanggal" className="p-4 text-gray-800 dark:text-gray-200">{p.payment_date}</td>
                          <td data-label="Nominal" className="p-4 text-green-800 dark:text-green-400 font-medium">{formatRupiah(p.amount)}</td>
                          <td data-label="Nota" className="p-4 text-center">
                            <button 
                              onClick={() => setReceiptData({ ...p, customerName: p.customer?.name })}
                              className="text-primary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 p-2 rounded-lg transition-colors"
                              title="Cetak nota" aria-label={`Cetak nota ${p.customer?.name}`}
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
                <table className="table-stack w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm">
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
                          <td data-primary className="p-4 text-gray-900 dark:text-white font-semibold">{c.name}</td>
                          <td data-label="No. HP" className="p-4 text-gray-700 dark:text-gray-300">{c.phone || '-'}</td>
                          <td data-label="Tagihan" className="p-4 text-red-700 dark:text-red-400 font-medium">{formatRupiah(c.monthly_fee)}</td>
                          <td data-label="Kirim tagihan" className="p-4 text-center">
                            <button 
                              onClick={() => handleSendWAMonthly(c)}
                              className="text-green-800 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 p-2 rounded-lg transition-colors flex items-center justify-center mx-auto gap-2 text-sm font-medium"
                              title="Kirim tagihan via WhatsApp" aria-label={`Kirim tagihan WhatsApp ke ${c.name}`}
                            >
                              <MessageCircle size={16} />
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
              placeholder="Cari nama pelanggan"
              value={yearlySearchTerm}
              onChange={(e) => {
                setYearlySearchTerm(e.target.value);
                setYearlyCurrentPage(1);
              }}
              aria-label="Cari nama pelanggan" className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white sm:max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              <input 
                type="number" 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                aria-label="Tahun laporan" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white w-28"
                min="2020" max="2100"
              />
              <button onClick={handleExportYearly} className="bg-primary hover:bg-[#014a85] text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                <Download size={18} /> Export Excel
              </button>
            </div>
          </div>
          
          {yearlyLoading ? (
            <div className="space-y-4">
              <CardsSkeleton label="Memuat laporan" />
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <table className="w-full"><tbody><RowsSkeleton colSpan={1} /></tbody></table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 p-4 font-medium border-b border-gray-100 dark:border-gray-700">Pelanggan</th>
                      {monthNames.map(m => (
                        <th key={m} className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-center">{m}</th>
                      ))}
                      <th className="p-4 font-medium border-b border-gray-100 dark:border-gray-700 text-right">Total Tunggakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedYearlyData.length === 0 ? (
                      <tr><td colSpan="14" className="p-6 text-center text-gray-600 dark:text-gray-400">Tidak ada pelanggan aktif yang cocok.</td></tr>
                    ) : (
                      paginatedYearlyData.map(c => {
                        const arrears = calculateYearlyArrears(c);
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 p-4 text-gray-900 dark:text-white font-medium">{c.name}</td>
                            {monthsList.map(m => (
                              <td key={m} className="p-4 text-center">
                                {renderMatrixCell(c, m)}
                              </td>
                            ))}
                            <td className="p-4 text-right">
                              {arrears > 0 ? (
                                <div className="flex items-center justify-end gap-3">
                                  <span className="text-red-700 dark:text-red-400 font-bold">{arrears} bln ({formatRupiah(arrears * c.monthly_fee)})</span>
                                  <button
                                    onClick={() => openWaModal(c)}
                                    className="grid place-items-center p-1.5 bg-green-100 text-green-800 hover:bg-green-700 hover:text-white rounded-lg transition-colors"
                                    title="Pilih bulan dan kirim tagihan via WhatsApp" aria-label={`Pilih bulan dan kirim tagihan WhatsApp ke ${c.name}`}
                                  >
                                    <MessageCircle size={18} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-green-800 dark:text-green-400 font-medium flex items-center justify-end gap-1"><CheckCircle size={14}/> Lunas</span>
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
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
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
      
      {waModalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-backdrop" role="dialog" aria-modal="true" aria-label="Kirim tagihan WhatsApp">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full overflow-hidden modal-panel">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">Kirim tagihan WhatsApp</h3>
              <button onClick={() => setWaModalData(null)} aria-label="Tutup" className="grid place-items-center size-11 -mr-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Pilih bulan yang ingin ditagihkan kepada <strong>{waModalData.customer.name}</strong>:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {waModalData.unpaidMonths.map(m => (
                  <label key={m.targetMonth} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary h-5 w-5"
                      checked={waModalData.selectedMonths.includes(m.targetMonth)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWaModalData({...waModalData, selectedMonths: [...waModalData.selectedMonths, m.targetMonth]});
                        } else {
                          setWaModalData({...waModalData, selectedMonths: waModalData.selectedMonths.filter(sm => sm !== m.targetMonth)});
                        }
                      }}
                    />
                    <span className="text-gray-800 dark:text-gray-200 font-medium">Bulan {m.name} {year}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => setWaModalData(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSendWASelected}
                disabled={waModalData.selectedMonths.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
              >
                <MessageCircle size={16} /> Kirim Pesan
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  );
}
