import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Gemini card generator endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const {
      sekolah,
      penulis,
      tahunPelajaran,
      kabupaten,
      kurikulum,
      kelasSemester,
      mataPelajaran,
      tujuanPembelajaran,
      jenisSoal,
      levelKognitif,
      jumlahSoal,
    } = req.body;

    if (!tujuanPembelajaran) {
      return res.status(400).json({ error: "Tujuan Pembelajaran (TP) wajib diisi." });
    }

    const count = parseInt(jumlahSoal) || 1;

    const systemInstruction = `Kamu adalah "Pembuat Kartu Soal AI", asisten khusus guru SMP (Kelas 7, 8, dan 9) untuk Kurikulum Merdeka.
Tugas utamamu adalah meracik Kartu Soal lengkap beserta Kunci Jawaban dan Pedoman Penskoran berbasis Tujuan Pembelajaran (TP) dan tingkat kognitif Bloom (C1–C4).

Informasi Profil Guru:
- Sekolah: ${sekolah || "SMP Negeri 2 Kintom"}
- Penulis Kisi-Kisi: ${penulis || "Musrin U. Ales"}
- Tahun Pelajaran: ${tahunPelajaran || "2024/2025"}
- Kurikulum: ${kurikulum || "Merdeka"}
- Kelas/Semester: ${kelasSemester || "7 / 1"}
- Mata Pelajaran: ${mataPelajaran || "IPA"}

Instruksi Output & Layout:
1. Wajib menghasilkan TEPAT ${count} nomor soal, dari nomor 1 sampai nomor ${count}. Dilarang berhenti menulis sebelum mencapai nomor ${count}.
2. Untuk pemetaan level kognitif, sesuaikan dengan input "${levelKognitif}":
   - Jika level kognitif adalah C1 atau C2: Pemetaan adalah "Pengetahuan/Pemahaman"
   - Jika level kognitif adalah C3: Pemetaan adalah "Aplikasi"
   - Jika level kognitif adalah C4: Pemetaan adalah "Penalaran"
3. Rumuskan "Ruang Lingkup Materi" secara otomatis dan logis yang relevan dengan TP mata pelajaran tersebut.
4. Buku Acuan / Referensi: Gunakan "KEMDIKBUD RI (Buku Siswa & Buku Guru)" yang sesuai dengan mata pelajaran bersangkutan.
5. Rumuskan "Indikator Soal" berstandar Kata Kerja Operasional (KKO) yang presisi sesuai TP dan tingkatan kognitif yang dipilih.
6. Buatlah butir soal lengkap berkualitas tinggi untuk siswa SMP sesuai jenis soal "${jenisSoal}":
   - Pilihan Ganda: Wajib menyertakan teks soal dan Opsi pilihan A, B, C, D secara rapi.
   - Esai / Uraian: Pertanyaan esai yang menuntut pemahaman mendalam, penalaran, atau analisis.
7. Berikan kunci jawaban / solusi beserta pembahasan logis di kolom Kunci Jawaban.
8. Berikan Pedoman Penskoran (rubrik penskoran detail per kriteria/kata kunci):
   - Pecah kriteria jawaban menjadi beberapa poin indikator penilaian.
   - Tentukan bobot skor pada tiap-tiap poin indikator.
   - Total skor maksimal soal harus merupakan jumlahan dari bobot skor tersebut.

Selain output data JSON, kamu WAJIB menghasilkan format tabel Markdown gabungan ("markdownTable") yang berisi seluruh kartu soal nomor 1 sampai ${count}. Format markdownTable ini HARUS mengikuti format persis berikut (dengan pemisah "---" dan baris kosong di antaranya):

---
### KARTU SOAL NOMOR [Nomor Soal]

| Field | Keterangan / Isi |
| :--- | :--- |
| **Level** | [Level Kognitif, misal: ${levelKognitif}] |
| **Ruang Lingkup Materi** | [Materi] |
| **Buku Acuan / Referensi** | [Referensi] |
| **Tujuan Pembelajaran (TP)** | [TP] |
| **Indikator Soal (KKO)** | [Indikator] |

**BUTIR SOAL NOMOR [Nomor Soal]:**
[Teks Narasi/Soal]
(Jika Pilihan Ganda, sertakan pilihan A, B, C, D di sini secara berurutan)

**KUNCI JAWABAN / SOLUSI:**
[Kunci Jawaban dan Alasan/Penjelasan]

**RUBRIK PEDOMAN PENSKORAN:**
| Indikator Kriteria Penilaian / Kata Kunci | Bobot Skor |
| :--- | :--- |
| [Kriteria Benar] | [Skor] |
| [Kriteria Salah / Kurang Tepat] | 0 |

**Total Skor Maksimal Soal [Nomor Soal]:** [Total Skor]

---
(ulangi untuk soal berikutnya hingga mencapai nomor ${count})`;

    const userPrompt = `Buatkan ${count} butir kartu soal Kurikulum Merdeka SMP dengan detail:
- Mata Pelajaran: ${mataPelajaran}
- Kelas/Semester: ${kelasSemester}
- Tujuan Pembelajaran (TP): ${tujuanPembelajaran}
- Jenis Soal: ${jenisSoal}
- Level Kognitif: ${levelKognitif}`;

    // Define models to try in order of preference
    const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash"];
    let jsonText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting generation with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                daftarSoal: {
                  type: Type.ARRAY,
                  description: `Daftar kartu soal terpisah dari nomor 1 sampai ${count}`,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nomorSoal: { type: Type.INTEGER },
                      materiPokok: { type: Type.STRING },
                      bukuAcuan: { type: Type.STRING },
                      indikatorSoal: { type: Type.STRING },
                      levelKognitif: { type: Type.STRING },
                      soal: { type: Type.STRING },
                      kunciJawaban: { type: Type.STRING },
                      pedomanPenskoran: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            kriteria: { type: Type.STRING },
                            skor: { type: Type.INTEGER },
                          },
                          required: ["kriteria", "skor"],
                        },
                      },
                      totalSkor: { type: Type.INTEGER },
                    },
                    required: [
                      "nomorSoal",
                      "materiPokok",
                      "bukuAcuan",
                      "indikatorSoal",
                      "levelKognitif",
                      "soal",
                      "kunciJawaban",
                      "pedomanPenskoran",
                      "totalSkor",
                    ],
                  },
                },
                markdownTable: {
                  type: Type.STRING,
                  description: "Format gabungan seluruh kartu soal dalam bentuk Markdown Table siap cetak",
                },
              },
              required: ["daftarSoal", "markdownTable"],
            },
          },
        });

        if (response && response.text) {
          jsonText = response.text.trim();
          break; // Success! Break out of the fallback loop
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed or returned error:`, err.message || err);
        // Continue to the next model in the fallback array
      }
    }

    if (!jsonText && lastError) {
      throw lastError;
    }

    const resultObj = JSON.parse(jsonText || "{}");
    res.json(resultObj);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: error.message || "Gagal memproses kartu soal melalui AI." });
  }
});

// Serve frontend assets
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
