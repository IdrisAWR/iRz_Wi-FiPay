import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useStore } from '../store';
import { ArrowRight } from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
const formatCompact = (number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(number);

export default function Dashboard() {
  const isDarkMode = useStore(state => state.isDarkMode);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error("Gagal mengambil data dashboard", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <PageSkeleton label="Memuat ringkasan bulan ini" />;
  }

  if (error || !stats) {
    return (
      <div role="alert" className="max-w-md rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-800 p-5">
        <p className="font-semibold text-gray-900 dark:text-white">Ringkasan tidak bisa dimuat</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Periksa koneksi internet, lalu coba lagi.</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 rounded-lg bg-primary text-white font-medium">Coba lagi</button>
      </div>
    );
  }

  const axisColor = isDarkMode ? '#cbd5e1' : '#475569';
  const lineColor = isDarkMode ? '#38bdf8' : '#0166bb';
  const hasChart = stats.chart_data?.length > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Pembayaran WiFi bulan ini</p>
      </div>

      {/* Yang perlu ditindak operator: siapa yang belum bayar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Link
          to="/unpaid"
          className="col-span-2 lg:col-span-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-800 p-5 flex items-end justify-between gap-4"
        >
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Belum bayar</p>
            <p className="text-5xl font-bold text-red-700 dark:text-red-400 leading-none mt-2">{stats.belum_bayar_bulan_ini}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">pelanggan</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-primary dark:text-sky-300">
            Lihat daftar <ArrowRight size={16} />
          </span>
        </Link>

        <Stat title="Pendapatan" value={formatRupiah(stats.total_pendapatan_bulan_ini)} wide />
        <Stat title="Sudah bayar" value={stats.sudah_bayar_bulan_ini} to="/reports" />
        <Stat title="Total pelanggan" value={stats.total_customers} to="/customers" />
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Pendapatan per bulan, 6 bulan terakhir</h2>
        {hasChart ? (
          <div className="h-56 md:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart_data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} dy={8} />
                <YAxis width={44} axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={formatCompact} />
                <Tooltip
                  formatter={(value) => [formatRupiah(value), "Pendapatan"]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    color: isDarkMode ? '#f1f5f9' : '#0f172a',
                    boxShadow: 'none'
                  }}
                  itemStyle={{ color: isDarkMode ? '#f1f5f9' : '#0f172a' }}
                />
                <Area type="monotone" dataKey="revenue" stroke={lineColor} strokeWidth={2.5} fill={lineColor} fillOpacity={0.08} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 py-8">Belum ada pembayaran tercatat. Catat pembayaran pertama di menu Pembayaran.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ title, value, to, wide }) {
  const body = (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">{value}</p>
    </>
  );
  const cls = `rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${wide ? 'col-span-2 lg:col-span-1' : ''}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
