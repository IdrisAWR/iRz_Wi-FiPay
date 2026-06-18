# iRz Wi-Fi (Manajemen Pembayaran WiFi)

Aplikasi web modern dan responsif yang dirancang khusus untuk mengelola pelanggan WiFi/ISP skala kecil menengah. Aplikasi ini memudahkan Anda dalam mendata pelanggan, mencatat pembayaran bulanan, mencetak nota, serta melihat laporan keuangan secara ringkas.

## 🌟 Fitur Utama

- **Dashboard Analitik**: Pantau total pelanggan, jumlah pelanggan yang sudah/belum membayar bulan ini, serta grafik tren pendapatan 6 bulan terakhir.
- **Manajemen Pelanggan**: Tambah, ubah, hapus, dan cari pelanggan dengan antarmuka yang cepat dan ramah pengguna.
- **Import & Export Excel**: Tambahkan ratusan data pelanggan secara massal menggunakan file Excel, serta unduh Laporan Pendapatan Bulanan dalam format Excel.
- **Catat Pembayaran Cerdas**: 
  - Mencari pelanggan dengan sistem *searchable dropdown* yang sangat cepat.
  - Otomatis menghitung jumlah bulan tertunggak.
  - Mendukung pembayaran beberapa bulan sekaligus (*multi-month payment*) dalam satu kali klik.
- **Mode Offline & Sinkronisasi**: Tetap bisa mencatat pembayaran meskipun koneksi internet terputus (saat di lapangan). Data akan otomatis disinkronkan ke *server* saat koneksi kembali (*Offline-first approach* menggunakan Dexie.js).
- **Cetak Nota Termal**: Otomatis menghasilkan nota pembayaran yang rapi dan siap dicetak menggunakan *printer thermal* maupun printer biasa.

## 🛠️ Teknologi yang Digunakan

**Frontend:**
- React.js + Vite
- Tailwind CSS (Styling)
- Dexie.js (Database lokal untuk Mode Offline)
- SheetJS / xlsx (Pemrosesan file Excel)
- Recharts (Visualisasi grafik)
- Lucide React (Ikon)

**Backend:**
- Laravel 11 (PHP)
- SQLite / MySQL (Database utama)

## 🚀 Panduan Instalasi (Development)

Pastikan komputer Anda sudah terinstal **Node.js**, **PHP (minimal v8.2)**, dan **Composer**.

### 1. Konfigurasi Backend (Laravel)
Buka terminal dan jalankan perintah berikut:
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```
*Backend akan berjalan di `http://127.0.0.1:8000`*

### 2. Konfigurasi Frontend (React)
Buka tab terminal baru dan jalankan:
```bash
cd frontend
npm install
```
Buat file bernama `.env` di dalam folder `frontend`, lalu isi dengan:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```
Kemudian jalankan server pengembangan:
```bash
npm run dev
```
*Aplikasi bisa diakses di `http://localhost:5173`*

## 📱 Panduan Mode Produksi (Local Server)
Jika Anda ingin menjalankan aplikasi ini di jaringan lokal (LAN/WiFi) agar bisa diakses dari HP, Anda harus melakukan proses *build* pada frontend dan menjalankan backend menggunakan IP lokal komputer (misalnya `192.168.1.xxx`). Panduan lengkapnya dapat Anda baca pada file `local_server_guide.md`.

---
*Dibuat oleh AwR untuk kemudahan manajemen RT/RW Net & ISP Lokal.*
