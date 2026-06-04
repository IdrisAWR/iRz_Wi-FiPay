import { Download, X, Wifi, MessageCircle } from 'lucide-react';
import { toJpeg, toBlob } from 'html-to-image';

export default function ReceiptModal({ receiptData, onClose }) {
  if (!receiptData) return null;

  const handleDownloadImage = async () => {
    const element = document.getElementById('receipt-download-area');
    if (!element) return;

    try {
      const dataUrl = await toJpeg(element, { 
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2 // High resolution
      });
      
      const link = document.createElement('a');
      link.download = `Nota_WifiPay_${receiptData.customerName || receiptData.customer?.name}_${receiptData.for_month}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Gagal membuat gambar nota", error);
      alert("Gagal membuat nota berupa foto");
    }
  };

  const handleSendWA = async () => {
    const phone = receiptData.customerPhone || receiptData.customer?.phone;
    
    if (!phone) {
      alert("Nomor telepon pelanggan tidak tersedia.");
      return;
    }

    const nominal = formatRupiah(receiptData.amount);
    const month = formatBulan(receiptData.for_month);
    const name = receiptData.customerName || receiptData.customer?.name;
    const refCode = receiptData.payment_code ? `\n*Kode Ref:* ${receiptData.payment_code}` : '';

    const text = `Terima kasih atas pembayaran tagihan WiFi Anda untuk bulan *${month}*.
*Total:* ${nominal}${refCode}
*Status:* LUNAS

Simpan nota ini sebagai bukti pembayaran yang sah.`;

    const element = document.getElementById('receipt-download-area');
    if (!element) return;

    try {
      // Buat gambar dalam bentuk Blob
      const blob = await toBlob(element, { 
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });

      const file = new File([blob], `Nota_${name.replace(/\s+/g, '_')}_${month}.png`, { type: 'image/png' });

      // 1. Coba gunakan Web Share API (Berjalan sangat baik di Mobile / HP)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Nota Pembayaran',
          text: text
        });
        return; // Jika berhasil share via HP, tidak perlu buka tab wa.me baru
      }

      // 2. Jika di Desktop (Web Share tidak mendukung file), salin gambar ke Clipboard
      try {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            'image/png': blob
          })
        ]);
        alert("Gambar nota telah disalin ke clipboard! Silakan 'Paste' (Ctrl+V) di kolom chat WhatsApp.");
      } catch (clipboardErr) {
        console.warn("Gagal menyalin ke clipboard", clipboardErr);
      }

      // 3. Buka tab WA
      const encodedText = encodeURIComponent(text);
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      }
      window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, '_blank');
      
    } catch (error) {
      console.error("Gagal memproses gambar nota", error);
      alert("Gagal memproses gambar nota untuk dikirim.");
    }
  };

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  const formatBulan = (bulan) => {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const [year, month] = bulan.split('-');
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transition-colors">
        {/* Header - Not included in image */}
        <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Preview Nota</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Receipt Content - This exact view will be downloaded as image */}
        <div id="receipt-download-area" className="p-8 space-y-6 bg-white relative">
          {/* Watermark / Decoration */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/10 to-blue-50/10 rounded-b-[40px] z-0"></div>
          
          <div className="text-center pb-6 border-b-2 border-dashed border-gray-200 relative z-10">
            <div className="flex justify-center mb-3">
              <div className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center">
                <Wifi size={48} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">Bukti Pembayaran Resmi</p>
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Tanggal Bayar</span>
                <span className="font-bold text-gray-800">{receiptData.payment_date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Pelanggan</span>
                <span className="font-bold text-gray-800">{receiptData.customerName || receiptData.customer?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Bulan Tagihan</span>
                <span className="font-bold text-gray-800 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{receiptData.for_month}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Status</span>
                <span className="font-bold text-green-600">LUNAS</span>
              </div>
              {receiptData.payment_code && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 border-dashed mt-2">
                <span className="text-sm text-gray-500 font-medium">Kode Ref</span>
                <span className="font-bold text-gray-800 text-sm font-mono tracking-tight">{receiptData.payment_code}</span>
              </div>
              )}
            </div>
          </div>
          
          <div className="pt-2 relative z-10">
            <div className="bg-primary text-white rounded-2xl p-5 shadow-lg shadow-blue-200 flex justify-between items-center">
              <span className="font-medium opacity-90">Total Tagihan</span>
              <span className="text-2xl font-black">{formatRupiah(receiptData.amount)}</span>
            </div>
          </div>
          
          <div className="text-center pt-8 text-xs text-gray-400 font-medium relative z-10">
            <p>Terima kasih atas pembayaran Anda.</p>
            <p className="mt-1">Simpan nota ini sebagai bukti pembayaran yang sah.</p>
            {/* <p className="mt-2 text-gray-300">Cek keaslian: {window.location.origin}/#/verify</p> */}
          </div>
        </div>

        {/* Footer Actions - Not included in image */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-center gap-3 border-t border-gray-100 dark:border-gray-700">
          <button 
            onClick={handleDownloadImage}
            className="flex-1 bg-primary hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-md shadow-blue-200 dark:shadow-none"
          >
            <Download size={20} /> Unduh Nota
          </button>
          <button 
            onClick={handleSendWA}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-md shadow-green-200 dark:shadow-none"
          >
            <MessageCircle size={20} /> Kirim ke WA
          </button>
        </div>
      </div>
    </div>
  );
}
