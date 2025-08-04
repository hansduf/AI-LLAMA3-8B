# Perencanaan Metode Pencarian Dokumen dengan Vector

## Tujuan
Membangun sistem pencarian dokumen berbasis semantic search menggunakan vector embedding agar pencarian dokumen relevan, cepat, dan scalable.

---

## Alur Kerja
1. **Upload Dokumen**
   - User meng-upload file (PDF/DOCX) melalui frontend.
   - Backend menyimpan file fisik dan metadata ke database.

2. **Ekstraksi & Embedding**
   - Backend mengekstrak teks dari dokumen.
   - Dokumen dipecah menjadi beberapa bagian (chunk) jika besar.
   - Setiap bagian dibuat embedding vector menggunakan model AI (Llama 3 atau model embedding lain).
   - Embedding vector dan teks bagian disimpan di vector database (Supabase vector).

3. **Pencarian Semantic**
   - User melakukan pencarian/query di frontend.
   - Query diubah menjadi embedding vector.
   - Backend melakukan similarity search di vector DB untuk menemukan dokumen/bagian paling relevan.
   - Backend mengirim hasil pencarian (metadata, ringkasan, link download/preview) ke frontend.

4. **Preview & Download**
   - User dapat melihat preview dokumen langsung di web atau mendownload file asli.
   - Model AI dapat memberikan penjelasan atau ringkasan isi dokumen sesuai permintaan user.

---

## Komponen Utama
- **Backend**: API upload, ekstraksi, embedding, pencarian, preview, download.
- **Vector DB**: Supabase vector untuk penyimpanan dan pencarian embedding.
- **Model AI**: Llama 3 untuk pembuatan embedding dan penjelasan dokumen.
- **Frontend**: UI upload, pencarian, preview, diskusi, download.
- **Task Queue**: Untuk proses batch ekstraksi dan embedding dokumen.

---

## Keuntungan
- Pencarian dokumen sangat cepat dan relevan.
- Mendukung ribuan dokumen dengan berbagai ukuran.
- User dapat diskusi, preview, dan download dokumen langsung dari web.

---

## Catatan Pengembangan
- Pastikan proses embedding dan indexing berjalan otomatis setelah upload.
- Gunakan chunking untuk dokumen besar agar pencarian lebih granular.
- Optimalkan keamanan dan performa database.
- Siapkan API untuk penjelasan dan diskusi dokumen oleh model AI.

---

## Referensi
- [Supabase Vector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Llama 3](https://ai.meta.com/blog/meta-llama-3/)
- [Semantic Search](https://towardsdatascience.com/semantic-search-3f6c3f7d3b0c)
