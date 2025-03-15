# Liqfinity Bot - Tutorial Penggunaan

![{A37F3237-8EFD-4A6D-A554-3A164A7CFC58}](https://github.com/user-attachments/assets/84dd176b-e1bd-483e-8e2b-943a2ba80f3d)

## Deskripsi

Liqfinity Bot adalah alat otomatisasi untuk melakukan aktivitas staking (lock/unlock) dan peminjaman (borrow/repay) pada platform Liqfinity. Bot ini membantu pengguna untuk mengoptimalkan pengumpulan poin reward melalui aktivitas liquidity mining dan peminjaman dengan cara yang terstruktur dan otomatis.

## Fitur Utama

- Staking otomatis (lock & unlock USDT)
- Peminjaman otomatis (borrow & repay)
- Kombinasi staking dan peminjaman
- Monitoring saldo wallet dan poin reward
- Status poin leaderboard
- Mode trial untuk pengguna baru

## Prasyarat

Sebelum menjalankan bot, pastikan sistem Anda memiliki:

1. [Node.js](https://nodejs.org/) (versi 14.x atau lebih tinggi)
2. Koneksi internet yang stabil
3. Akun pada platform [Liqfinity Testnet](https://app.testnet.liqfinity.com/)
4. Token akses Liqfinity Testnet

## Instalasi

### Langkah 1: Clone atau Download Repository

```bash
git clone https://github.com/YoaTzy/liqfinity-bot.git
```

atau download file zip dan ekstrak ke folder pilihan Anda.

### Langkah 2: Instalasi Dependensi

Buka terminal/command prompt, navigasi ke folder program dan jalankan:

```bash
cd liqfinity-bot
npm install
```

Perintah di atas akan menginstal semua dependencies yang diperlukan seperti:
- puppeteer
- chalk
- fs
- readline

## Konfigurasi

### Menyiapkan Token Akses

1. Login ke akun [Liqfinity Testnet](https://app.testnet.liqfinity.com/)
2. Dapatkan token akses dari browser:
   - Buka DevTools (F12 atau klik kanan -> Inspect)
   - Pilih tab "Network"
   - Lakukan refresh halaman
   - Cari request yang menuju ke domain `api.testnet.liqfinity.com`
   - Lihat pada header request, cari header "Authorization" yang berformat `Bearer xxxx...`
   - Salin token (bagian setelah "Bearer ")

3. Buat file baru bernama `token.txt` di folder program
4. Paste token yang sudah disalin ke dalam file tersebut dan simpan

## Cara Penggunaan

### Menjalankan Program

Buka terminal/command prompt, navigasi ke folder program dan jalankan:

```bash
node index.js
```

### Menu Utama

Program memiliki menu utama dengan beberapa opsi:

1. **Lock & Unlock (Staking) STABLE**
   - Melakukan operasi staking otomatis
   - Tersedia opsi menggunakan 50% atau 100% dari saldo

2. **Borrow & Repay (Loans) - BETA**
   - Melakukan operasi peminjaman dan pembayaran otomatis
   - Menggunakan collateral yang tersedia di akun

3. **Both Lock/Unlock & Borrow/Repay - BETA**
   - Kombinasi operasi staking dan peminjaman
   - Mengoptimalkan pengumpulan poin dari kedua aktivitas

4. **Display User Information Only**
   - Menampilkan informasi wallet, poin, dan pinjaman aktif
   - Tidak melakukan operasi apapun

5. **Exit**
   - Keluar dari program

### Mode Operasi

Setelah memilih mode operasi (opsi 1-3), program akan menampilkan strategi yang dipilih dan menunggu konfirmasi sebelum memulai operasi otomatis.

Selama operasi berjalan:
- Program akan menampilkan informasi realtime tentang setiap operasi
- Anda dapat melihat saldo wallet, status poin, dan detail operasi lainnya
- Untuk menghentikan operasi, tekan `Ctrl+C` kapan saja

## Penjelasan Detail Menu

### 1. Lock & Unlock (Staking)

Mode ini fokus pada operasi staking, dengan alur kerja:
1. Mengunci (lock) sejumlah USDT sesuai persentase yang dipilih
2. Menunggu beberapa saat
3. Membuka kunci (unlock) USDT yang terkunci
4. Mengulangi proses untuk mengumpulkan liquidity points

Opsi tersedia:
- **50% dari saldo** - Menyisakan lebih banyak saldo untuk operasi lain
- **100% dari saldo** - Memaksimalkan staking (menyisakan 1 USDT untuk fee)

### 2. Borrow & Repay (Loans)

Mode ini fokus pada operasi peminjaman, dengan alur kerja:
1. Mencari collateral tersedia (LTC, BTC, ETH)
2. Melakukan peminjaman USDT dengan collateral tersebut
3. Menunggu waktu optimal (minimal 10 menit)
4. Membayar pinjaman
5. Mengulangi proses untuk mengumpulkan borrow points

Program akan mempertahankan maksimal 5 pinjaman aktif secara bersamaan.

### 3. Kombinasi Lock/Unlock & Borrow/Repay

Mode ini menggabungkan kedua operasi di atas, dengan tambahan pengaturan:
- Mengalokasikan sebagian saldo untuk staking
- Menyisakan sebagian saldo untuk operasi peminjaman
- Memprioritaskan operasi berdasarkan ketersediaan dana

## Sistem Lisensi

Program memiliki sistem lisensi dengan 2 mode:
1. **Mode Trial**: Aktif selama 1 jam (Timezone WIB)
2. **Mode Permanen**: Tersedia setelah pembelian lisensi

Untuk membeli lisensi, hubungi pengembang di Telegram: [@yoakeid](https://t.me/yoakeid)

## Troubleshooting

### Masalah Umum:

1. **"Error reading token file"**
   - Pastikan file `token.txt` ada di folder program
   - Pastikan token yang dimasukkan valid dan lengkap

2. **"Error making request"**
   - Periksa koneksi internet Anda
   - Token mungkin sudah kedaluwarsa, perbarui token

3. **"No available collaterals found"**
   - Pastikan akun memiliki collateral (LTC, BTC, ETH) tersedia
   - Collateral mungkin sedang digunakan untuk pinjaman lain

4. **"Insufficient balance"**
   - Pastikan wallet memiliki saldo USDT yang cukup
   - Tambahkan saldo untuk melanjutkan operasi

### Pemberhentian Mendadak:

Jika program berhenti secara mendadak, coba:
1. Restart program
2. Perbarui token akses
3. Jika masalah berlanjut, hubungi pengembang

## Disclaimer

Program ini hanya untuk penggunaan pribadi dan tidak boleh dijual kembali atau didistribusikan ulang. Penggunaan pada jaringan testnet dan tidak disarankan untuk digunakan pada jaringan produksi tanpa pemahaman risiko yang terlibat.

## Support

Untuk pertanyaan dan dukungan, hubungi:
- Telegram: [@yoakeid](https://t.me/yoakeid)

---

© 2025 Liqfinity Bot. All rights reserved.
