# Hallo BOPKRI Backend

Backend layanan pengaduan publik berbasis NestJS, MySQL, dan Prisma.

Tiga jenis masukan (`QUESTION`, `APPRECIATION`, dan `COMPLAINT`) menggunakan
satu modul `complaints` karena struktur data, alur tiket, status, lampiran, dan
pengelolaan adminnya sama. Pemisahan dilakukan melalui field `category`, bukan
duplikasi tiga modul yang isinya identik.

## Fitur

- Kirim aduan tanpa login dan menerima kode tiket acak.
- Nama dan kontak pelapor bersifat opsional.
- Maksimal tiga bukti JPG, PNG, atau PDF; masing-masing maksimal 5 MB.
- Pelacakan publik tidak menampilkan kontak maupun bukti pelapor.
- Login admin dengan JWT dan password bcrypt.
- Master status dinamis yang dapat dikelola admin tanpa migration baru.
- Filter berdasarkan kategori, status, tanggal, dan pencarian teks.
- Riwayat progres dan notifikasi perubahan status ke email/WhatsApp pelapor.
- Notifikasi aduan baru ke email dan WhatsApp admin.
- Export laporan terfilter ke Excel dan PDF.
- Swagger, validation pipe, CORS, Helmet, dan rate limit.

Kategori schema:

- `QUESTION` — pertanyaan atau umpan balik.
- `APPRECIATION` — apresiasi.
- `COMPLAINT` — komplain atau protes.

Status bukan lagi enum. Seed menyediakan `NEW`, `VERIFIED`, `FORWARDED`,
`IN_PROGRESS`, `RESOLVED`, dan `REJECTED`. Admin dapat mendaftarkan status
tambahan, mengubah label/warna/urutan, atau menonaktifkannya.

## Menjalankan aplikasi

Persyaratan: Node.js 20.19+ dan MySQL. Database perlu dibuat lebih dahulu,
misalnya `hallo-bopkri`. `compose.yaml` tersedia jika ingin menjalankan MySQL
lokal melalui Docker.

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

Server menggunakan port `4000` sesuai `.env` dan Swagger tersedia di:

```text
http://localhost:4000/api/docs
```

## Format pengiriman aduan

Gunakan `multipart/form-data`:

| Field | Wajib | Keterangan |
|---|---|---|
| `category` | Ya | `QUESTION`, `APPRECIATION`, atau `COMPLAINT` |
| `content` | Ya | Isi minimal 10 karakter |
| `reporterName` | Tidak | Nama pelapor |
| `contact` | Tidak | Email atau nomor WhatsApp |
| `attachments` | Tidak | Maksimal 3 file JPG, PNG, atau PDF |

Contoh cURL:

```bash
curl -X POST http://localhost:4000/api/complaints \
  -F 'category=COMPLAINT' \
  -F 'reporterName=Budi Santoso' \
  -F 'contact=081234567890' \
  -F 'content=Saya ingin melaporkan kendala layanan yang terjadi hari ini.' \
  -F 'attachments=@./bukti.pdf'
```

## Endpoint

| Method | Endpoint | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api` | Publik | Health check |
| `POST` | `/api/complaints` | Publik | Kirim aduan dan bukti |
| `GET` | `/api/complaints/track/:ticketCode` | Publik | Lacak progres |
| `POST` | `/api/admin/auth/login` | Publik | Login admin |
| `GET` | `/api/admin/complaints/dashboard` | Admin | Rekap |
| `GET` | `/api/admin/complaints` | Admin | Daftar dan filter |
| `GET` | `/api/admin/complaints/export.xlsx` | Admin | Export Excel |
| `GET` | `/api/admin/complaints/export.pdf` | Admin | Export PDF |
| `GET` | `/api/admin/complaints/attachments/:id` | Admin | Unduh bukti |
| `GET` | `/api/admin/complaints/:id` | Admin | Detail lengkap |
| `PATCH` | `/api/admin/complaints/:id/status` | Admin | Ubah progres |
| `GET` | `/api/admin/complaint-statuses` | Admin | Daftar master status |
| `POST` | `/api/admin/complaint-statuses` | Admin | Daftarkan status baru |
| `PATCH` | `/api/admin/complaint-statuses/:id` | Admin | Edit/nonaktifkan status |

Endpoint admin memakai header `Authorization: Bearer <accessToken>`.

Parameter daftar dan export: `category`, `statusId`, `search`, `dateFrom`, dan
`dateTo`. Endpoint daftar juga menerima `page` dan `limit`.

Perubahan progres aduan menggunakan ID master status:

```json
{
  "statusId": "00000000-0000-4000-8000-000000000004",
  "publicNote": "Aduan sedang ditangani oleh bidang terkait."
}
```

Contoh mendaftarkan status manual:

```json
{
  "code": "WAITING_SCHOOL_RESPONSE",
  "name": "Menunggu Jawaban Sekolah",
  "description": "Aduan menunggu jawaban dari pihak sekolah.",
  "color": "#F59E0B",
  "sortOrder": 5,
  "isFinal": false
}
```

## Email dan WhatsApp

Email memakai SMTP. Isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, dan `SMTP_FROM`. Jika `SMTP_HOST` kosong, email otomatis
dinonaktifkan tanpa menggagalkan penyimpanan aduan.

WhatsApp dibuat gateway-agnostic karena setiap penyedia memiliki format API
berbeda. Backend mengirim request berikut ke `WHATSAPP_GATEWAY_URL`:

```json
{
  "target": "6281234567890",
  "message": "Isi notifikasi"
}
```

Token dikirim melalui `Authorization: Bearer <WHATSAPP_GATEWAY_TOKEN>`. Jika
provider Anda memakai format lain (misalnya Fonnte, Wablas, atau Meta Cloud
API), cukup sesuaikan method `sendWhatsApp` di
`src/notifications/notifications.service.ts`.

## Verifikasi

```bash
npm run lint
npm run build
npm test
npm run test:e2e
```

Untuk production, gunakan HTTPS, password dan JWT secret yang kuat, CAPTCHA
pada form publik, backup database, penyimpanan objek untuk lampiran, dan
gateway notifikasi dengan retry/queue.
# hallo-bopkri-be
