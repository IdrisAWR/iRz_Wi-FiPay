# Panduan Menjadikan Komputer Anda Server Lokal (dengan Laragon)

Panduan ini ditujukan agar komputer Anda bertindak sebagai **Server Lokal (Intranet)** menggunakan Laragon. Dengan metode ini, Anda **tidak perlu lagi** membuka terminal untuk menjalankan `php artisan serve` atau `npm run dev`. Selama Laragon menyala, aplikasi iR Wi-Fi bisa diakses 24 jam oleh seluruh perangkat (HP, Laptop) di jaringan WiFi Anda.

---

## Tahap 1: Ketahui IP Komputer Server Anda
Langkah pertama dan terpenting adalah mengetahui IP lokal komputer yang diinstal Laragon (Server).
1. Buka **Command Prompt (CMD)**.
2. Ketik `ipconfig` dan tekan Enter.
3. Catat angka pada **IPv4 Address** (contoh: `192.168.1.15`). 
*(Gunakan angka IP Anda sendiri untuk langkah-langkah selanjutnya di bawah ini).*

---

## Tahap 2: Menyiapkan Backend di Laragon

Kita akan meletakkan backend Laravel ke dalam folder publik Laragon agar otomatis di-hosting oleh Apache/Nginx milik Laragon.

1. Buka folder instalasi Laragon Anda (biasanya di `C:\laragon\www`).
2. Buat folder baru bernama **`wifipay-api`** di dalam folder `www` tersebut (`C:\laragon\www\wifipay-api`).
3. Copy **seluruh isi** dari folder `backend` proyek Anda saat ini ke dalam folder `C:\laragon\www\wifipay-api` tersebut.
4. Buka file `.env` di dalam folder `wifipay-api` tersebut. Pastikan pengaturan koneksi database sudah benar:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=wifipay   # Pastikan Anda membuat database dengan nama ini di Laragon baru Anda
   DB_USERNAME=root      # Default username MySQL Laragon
   DB_PASSWORD=          # Default password MySQL Laragon (kosong)
   ```
   Lalu ubah bagian `APP_URL` sesuai IP komputer baru Anda:
   ```env
   APP_URL=http://192.168.1.15/wifipay-api/public
   ```
   *(Ganti dengan IP Anda).*

5. Buka **HeidiSQL** (bisa diakses dengan klik tombol **Database** di aplikasi Laragon) dan buat database baru dengan nama `wifipay`.

6. Buka Terminal Laragon (klik tombol **Terminal** di aplikasi Laragon), arahkan ke folder `C:\laragon\www\wifipay-api`, lalu jalankan perintah-perintah ini secara berurutan:
   
   a. Install dependensi (jika folder vendor belum terbawa):
   ```bash
   composer install
   ```
   
   b. Migrasi struktur database dan buat akun admin default (`admin@wifipay.com` / `password`):
   ```bash
   php artisan migrate --seed
   ```
   
   c. Tautkan folder penyimpanan foto (agar nota bisa diakses):
   ```bash
   php artisan storage:link
   ```

---

## Tahap 3: Menyiapkan & Mem-build Frontend

Frontend React perlu di-_build_ agar menjadi file statis (HTML/JS/CSS) yang tidak butuh Node.js lagi untuk berjalan.

1. Buka folder `frontend` dari proyek asli Anda.
2. Buat file baru bernama **`.env`** (jika belum ada) di dalam folder `frontend` tersebut.
3. Isi file `.env` tersebut dengan baris berikut:
   ```env
   VITE_API_URL=http://192.168.1.15/wifipay-api/public/index.php/api
   ```
   *(Penting: Ganti dengan IP Anda. Ini akan memberitahu Frontend ke mana ia harus mengirim dan mengambil data saat dijalankan di HP).*
4. Buka terminal di folder `frontend` tersebut, lalu jalankan perintah build:
   ```bash
   npm run build
   ```
5. Tunggu hingga selesai. Proses ini akan menghasilkan folder baru bernama **`dist`** di dalam folder `frontend`.

---

## Tahap 4: Memindahkan Frontend ke Laragon

Sekarang kita letakkan hasil _build_ Frontend ke Laragon agar bisa diakses.

1. Buka kembali folder Laragon Anda (`C:\laragon\www`).
2. Buat folder baru bernama **`wifipay`** (`C:\laragon\www\wifipay`).
3. Buka folder **`dist`** yang baru saja Anda buat di Tahap 3.
4. Copy **seluruh isi file dan folder** yang ada di dalam `dist`, lalu Paste ke dalam folder `C:\laragon\www\wifipay`.

*(Konfigurasi Selesai! Kini Anda memiliki folder `wifipay` untuk tampilan, dan `wifipay-api` untuk database di dalam Laragon).*

---

## Tahap 5: Pengujian

1. Buka aplikasi **Laragon** di komputer Anda, dan pastikan tombol **Start All** sudah diklik (Apache dan MySQL harus berstatus jalan/Start).
2. Ambil HP Anda, pastikan terhubung ke WiFi yang sama dengan komputer server.
3. Buka Browser (Chrome/Safari) di HP, lalu ketikkan alamat:
   ```text
   http://192.168.1.15/wifipay
   ```
   *(Ganti angka dengan IP komputer Anda).*
4. Halaman Login iR Wi-Fi akan muncul! Coba lakukan login dan pastikan semua data tampil dengan baik.

---

### Tips Penting!
1. **IP Komputer Berubah**: Ingat, jika router mematikan/merestart WiFi, IP komputer Anda (`192.168.1.x`) mungkin bisa berubah. Jika ini terjadi, Anda harus mengulang **Tahap 3 & 4** dengan IP yang baru. Untuk mencegahnya, sangat disarankan men-setting IP Statis (Static IP) untuk komputer server Anda pada pengaturan Router WiFi.
2. **Akses Root Laragon**: Karena kita menggunakan akses IP langsung (bukan `.test`), maka URL aplikasi harus menggunakan nama foldernya, yaitu `/wifipay` dan `/wifipay-api/public`. Fitur _Auto Virtual Host_ Laragon (`.test`) hanya bekerja di komputer itu sendiri, tidak bisa dipanggil langsung dari HP tanpa konfigurasi rumit tambahan. Metode IP + Nama Folder ini adalah metode yang paling andal untuk server lokal WiFi!
