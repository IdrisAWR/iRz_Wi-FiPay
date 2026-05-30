import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useStore } from '../store';
import { Users, CheckCircle, XCircle, DollarSign, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const isDarkMode = useStore(state => state.isDarkMode);
  const [stats, setStats] = useState({
    total_customers: 0,
    sudah_bayar_bulan_ini: 0,
    belum_bayar_bulan_ini: 0,
    total_pendapatan_bulan_ini: 0,
    chart_data: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (error) {
      console.error("Gagal mengambil data dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  };

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Ringkasan pembayaran WiFi bulan ini</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Pelanggan" 
          value={stats.total_customers} 
          icon={<Users size={24} className="text-blue-500 dark:text-blue-400" />} 
          bg="bg-blue-50 dark:bg-blue-900/30" 
          linkTo="/customers"
        />
        <StatCard 
          title="Sudah Bayar" 
          value={stats.sudah_bayar_bulan_ini} 
          icon={<CheckCircle size={24} className="text-green-500 dark:text-green-400" />} 
          bg="bg-green-50 dark:bg-green-900/30" 
          linkTo="/reports"
        />
        <StatCard 
          title="Belum Bayar" 
          value={stats.belum_bayar_bulan_ini} 
          icon={<XCircle size={24} className="text-red-500 dark:text-red-400" />} 
          bg="bg-red-50 dark:bg-red-900/30" 
          linkTo="/unpaid"
        />
        <StatCard 
          title="Pendapatan Bulan Ini" 
          value={formatRupiah(stats.total_pendapatan_bulan_ini)} 
          icon={<DollarSign size={24} className="text-purple-500 dark:text-purple-400" />} 
          bg="bg-purple-50 dark:bg-purple-900/30" 
        />
      </div>

      {/* Area Chart - Trend Pendapatan */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-8 transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-primary" size={24} />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tren Pendapatan 6 Bulan Terakhir</h2>
        </div>
        
        <div className="h-80 w-full overflow-x-auto">
          <div className="min-w-[500px] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f3f4f6'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}k`}
                  dx={-10}
                />
                <Tooltip 
                  formatter={(value) => [formatRupiah(value), "Pendapatan"]}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#f3f4f6' : '#111827',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                  itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: isDarkMode ? '#1f2937' : '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg, linkTo }) {
  const content = (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-all ${linkTo ? 'hover:shadow-md dark:hover:shadow-gray-900 hover:-translate-y-1 cursor-pointer' : 'cursor-default'}`}>
      <div className={`p-4 rounded-xl ${bg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 truncate" title={title}>{title}</p>
        <p className="text-xl xl:text-2xl font-bold text-gray-800 dark:text-white truncate" title={value}>{value}</p>
      </div>
    </div>
  );

  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}
