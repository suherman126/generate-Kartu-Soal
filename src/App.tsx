import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Download,
  Printer,
  Copy,
  RotateCcw,
  Sparkles,
  Check,
  CheckSquare,
  Square,
  Trash2,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  User,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Structure for single question
interface QuestionItem {
  nomorSoal: number;
  materiPokok: string;
  bukuAcuan: string;
  indikatorSoal: string;
  levelKognitif: string;
  soal: string;
  kunciJawaban: string;
  pedomanPenskoran: Array<{
    kriteria: string;
    skor: number;
  }>;
  totalSkor: number;
}

// Structure for Gemini API return
interface GeneratedAssessment {
  daftarSoal: QuestionItem[];
  markdownTable: string;
}

// Saved item in localStorage
interface SavedCardSet {
  id: string;
  createdAt: string;
  createdAtLabel: string;
  payload: {
    sekolah: string;
    penulis: string;
    tahunPelajaran: string;
    kabupaten: string;
    kurikulum: string;
    kelasSemester: string;
    mataPelajaran: string;
    tujuanPembelajaran: string;
    jenisSoal: string;
    levelKognitif: string;
    jumlahSoal: number;
  };
  resultData: GeneratedAssessment;
}

export default function App() {
  // Form parameters state
  const [sekolah, setSekolah] = useState("SMP Negeri 2 Kintom");
  const [penulis, setPenulis] = useState("Musrin U. Ales");
  const [tahunPelajaran, setTahunPelajaran] = useState("2024/2025");
  const [kabupaten, setKabupaten] = useState("Banggai");
  const [kurikulum, setKurikulum] = useState("Merdeka");
  const [kelasSemester, setKelasSemester] = useState("7 / Ganjil");
  const [mataPelajaran, setMataPelajaran] = useState("IPA (Ilmu Pengetahuan Alam)");
  const [jenisSoal, setJenisSoal] = useState("Pilihan Ganda");
  const [levelKognitif, setLevelKognitif] = useState("C4");
  const [jumlahSoal, setJumlahSoal] = useState(1);
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<"visual" | "markdown" | "json">("visual");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [resultData, setResultData] = useState<GeneratedAssessment | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCardSet[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Template Tujuan Pembelajaran
  const templates = [
    {
      subject: "IPA (Kelas 7)",
      text: "Peserta didik mampu menganalisis interaksi antara makhluk hidup dan lingkungannya serta merancang solusi atas masalah pencemaran lingkungan.",
    },
    {
      subject: "Matematika (Kelas 8)",
      text: "Peserta didik mampu membuktikan teorema Pythagoras dan menggunakannya dalam menyelesaikan masalah kontekstual.",
    },
    {
      subject: "IPS (Kelas 9)",
      text: "Peserta didik mampu menganalisis dinamika kependudukan dan perubahan ruang benua Asia dan dampaknya terhadap kesejahteraan sosial ekonomi.",
    },
    {
      subject: "Bahasa Inggris (Kelas 7)",
      text: "Peserta didik mampu membandingkan fungsi sosial, struktur teks, dan unsur kebahasaan beberapa teks deskriptif lisan dan tulis.",
    }
  ];

  // Load saved cards from localStorage on mount
  useEffect(() => {
    const local = localStorage.getItem("pembuat_kartu_soal_bank");
    if (local) {
      try {
        setSavedCards(JSON.parse(local));
      } catch (e) {
        console.error("Gagal memuat local bank soal", e);
      }
    }
  }, []);

  // Show floating toast
  const triggerToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Quick fill TP
  const selectTemplate = (text: string, subject: string) => {
    setTujuanPembelajaran(text);
    setMataPelajaran(subject.split(" (")[0]);
    triggerToast(`Mengisi template ${subject}`, "success");
  };

  // Generate assessment
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tujuanPembelajaran.trim()) {
      triggerToast("Tujuan Pembelajaran wajib diisi!", "error");
      return;
    }

    setLoading(true);
    setResultData(null);
    
    // Pedagogical loading animation steps
    const steps = [
      "Membaca parameter Kurikulum Merdeka...",
      "Menganalisis Alur Tujuan Pembelajaran (ATP)...",
      "Merumuskan Kata Kerja Operasional (KKO) Bloom...",
      "Menyusun Ruang Lingkup Materi Pokok...",
      "Merancang Butir Soal dan Opsi Jawaban...",
      "Membuat Kunci Jawaban & Rubrik Penskoran detail..."
    ];

    let currentStepIdx = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < steps.length) {
        setLoadingStep(steps[currentStepIdx]);
      }
    }, 1500);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menghubungi AI Server.");
      }

      const data: GeneratedAssessment = await response.json();
      setResultData(data);
      setActiveTab("visual");

      // Auto save to local storage history
      const newCardSet: SavedCardSet = {
        id: "card_" + Date.now(),
        createdAt: new Date().toISOString(),
        createdAtLabel: new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
        payload: {
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
        },
        resultData: data,
      };

      const updatedHistory = [newCardSet, ...savedCards];
      setSavedCards(updatedHistory);
      localStorage.setItem("pembuat_kartu_soal_bank", JSON.stringify(updatedHistory));

      triggerToast("Kartu soal berhasil diracik dan disimpan di riwayat!", "success");
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      triggerToast(err.message || "Terjadi kesalahan koneksi AI.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load old card back into preview
  const handleLoadSaved = (card: SavedCardSet) => {
    setSekolah(card.payload.sekolah);
    setPenulis(card.payload.penulis);
    setTahunPelajaran(card.payload.tahunPelajaran);
    setKabupaten(card.payload.kabupaten);
    setKurikulum(card.payload.kurikulum);
    setKelasSemester(card.payload.kelasSemester);
    setMataPelajaran(card.payload.mataPelajaran);
    setJenisSoal(card.payload.jenisSoal);
    setLevelKognitif(card.payload.levelKognitif);
    setJumlahSoal(card.payload.jumlahSoal);
    setTujuanPembelajaran(card.payload.tujuanPembelajaran);
    
    setResultData(card.resultData);
    setActiveTab("visual");
    triggerToast("Memuat kartu soal dari bank penyimpanan!", "info");
  };

  // Delete card from history
  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedCards.filter((c) => c.id !== id);
    setSavedCards(updated);
    localStorage.setItem("pembuat_kartu_soal_bank", JSON.stringify(updated));
    triggerToast("Kartu soal dihapus dari bank penyimpanan.", "info");
  };

  // Copy Markdown Table to Clipboard
  const handleCopyMarkdown = () => {
    if (!resultData?.markdownTable) {
      triggerToast("Tidak ada markdown untuk disalin.", "error");
      return;
    }
    navigator.clipboard.writeText(resultData.markdownTable);
    triggerToast("Berhasil menyalin tabel Markdown ke papan klip!", "success");
  };

  // Download Word (.doc) containing structured HTML table
  const handleDownloadWord = () => {
    if (!resultData) {
      triggerToast("Tidak ada data untuk diekspor.", "error");
      return;
    }

    const cardsHtml = resultData.daftarSoal.map((q) => {
      let rubrikHtml = "";
      q.pedomanPenskoran.forEach((p) => {
        rubrikHtml += `
          <tr style="border: 1px solid #000000;">
            <td style="border: 1px solid #000000; padding: 6px;">${p.kriteria}</td>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${p.skor}</td>
          </tr>
        `;
      });

      return `
        <div style="border: 2px solid #000000; padding: 15px; margin-bottom: 25px; page-break-inside: avoid;">
          <h4 style="background-color: #f0f0f0; margin: 0 0 10px 0; padding: 8px; border-bottom: 1px solid #000000; font-family: 'Times New Roman', Times, serif;">
            KARTU SOAL NOMOR ${q.nomorSoal}
          </h4>
          <table border="1" cellspacing="0" cellpadding="5" style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">
            <tr>
              <td style="background-color: #f7f7f7; font-weight: bold; width: 30%;">Ruang Lingkup Materi</td>
              <td>${q.materiPokok}</td>
            </tr>
            <tr>
              <td style="background-color: #f7f7f7; font-weight: bold;">Buku Acuan / Referensi</td>
              <td>${q.bukuAcuan}</td>
            </tr>
            <tr>
              <td style="background-color: #f7f7f7; font-weight: bold;">Tujuan Pembelajaran (TP)</td>
              <td>${tujuanPembelajaran}</td>
            </tr>
            <tr>
              <td style="background-color: #f7f7f7; font-weight: bold;">Indikator Soal (KKO)</td>
              <td>${q.indikatorSoal}</td>
            </tr>
          </table>

          <div style="border: 1px solid #000000; padding: 10px; background-color: #fafafa; margin-bottom: 12px; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt;">
            <strong>BUTIR SOAL NOMOR ${q.nomorSoal}:</strong>
            <p style="white-space: pre-line; margin: 5px 0 12px 0;">${q.soal}</p>
            <hr style="border: none; border-top: 1px dashed #000000; margin: 10px 0;"/>
            <strong>KUNCI JAWABAN / SOLUSI:</strong>
            <p style="white-space: pre-line; margin: 5px 0 0 0;">${q.kunciJawaban}</p>
          </div>

          <table border="1" cellspacing="0" cellpadding="5" style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 9.5pt;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="text-align: left; padding: 6px;">Indikator Kriteria Penilaian / Kata Kunci</th>
                <th style="width: 100px; text-align: center; padding: 6px;">Bobot Skor</th>
              </tr>
            </thead>
            <tbody>
              ${rubrikHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #fdfdfd; font-weight: bold;">
                <td style="text-align: right; padding: 6px;">Total Skor Maksimal:</td>
                <td style="text-align: center; padding: 6px;">${q.totalSkor}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }).join("<br/>");

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Kartu Soal Kurikulum Merdeka</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 1.2cm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.3;
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">KARTU SOAL TAHUN PELAJARAN ${tahunPelajaran}</h2>
          <h3 style="margin: 5px 0 0 0; font-size: 12pt; font-weight: bold; text-transform: uppercase;">KABUPATEN ${kabupaten.toUpperCase()}</h3>
          <p style="margin: 3px 0 0 0; font-size: 10pt; font-style: italic;">Sekolah: ${sekolah} | Kurikulum: ${kurikulum}</p>
        </div>
        <hr style="border: none; border-top: 2px solid #000000; margin-bottom: 20px;"/>
        
        <table border="1" cellspacing="0" cellpadding="6" style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt;">
          <tr>
            <td style="background-color: #eaeaea; font-weight: bold; width: 30%;">Satuan Kerja / Sekolah</td>
            <td>${sekolah}</td>
          </tr>
          <tr>
            <td style="background-color: #eaeaea; font-weight: bold;">Penulis Kisi-Kisi</td>
            <td>${penulis}</td>
          </tr>
          <tr>
            <td style="background-color: #eaeaea; font-weight: bold;">Bahan Kelas / Semester</td>
            <td>Kelas ${kelasSemester}</td>
          </tr>
          <tr>
            <td style="background-color: #eaeaea; font-weight: bold;">Mata Pelajaran</td>
            <td>${mataPelajaran}</td>
          </tr>
        </table>

        ${cardsHtml}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Kartu_Soal_${mataPelajaran.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast("Berhasil mengunduh dokumen MS Word!", "success");
  };

  // Open A4 print dialog
  const handlePrint = () => {
    if (!resultData) {
      triggerToast("Tidak ada data untuk dicetak.", "error");
      return;
    }
    // Switch to visual tab first to make sure printable content is rendered
    setActiveTab("visual");
    triggerToast("Membuka dialog cetak... Jika tidak muncul, silakan buka aplikasi di Tab Baru.", "info");
    
    setTimeout(() => {
      window.focus();
      try {
        window.print();
      } catch (err) {
        console.error("Print failed:", err);
        triggerToast("Gagal membuka dialog cetak otomatis. Silakan tekan Ctrl+P atau Cmd+P.", "error");
      }
    }, 200);
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col antialiased">
      
      {/* Toast notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-xs font-semibold tracking-wide border ${
              toastMessage.type === "success"
                ? "bg-emerald-900 text-emerald-50 border-emerald-800"
                : toastMessage.type === "error"
                ? "bg-rose-900 text-rose-50 border-rose-800"
                : "bg-slate-900 text-slate-50 border-slate-800"
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase sm:text-base">
                Pembuat Kartu Soal AI
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Penyusun Kisi-Kisi, Soal & Rubrik Asesmen SMP Kurikulum Merdeka
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 hidden md:inline">
              Guru: <span className="text-slate-100 font-semibold">{penulis}</span>
            </span>
            <span className="h-4 w-px bg-slate-700 hidden md:inline" />
            <button
              onClick={() => {
                setSekolah("SMP Negeri 2 Kintom");
                setPenulis("Musrin U. Ales");
                setTahunPelajaran("2024/2025");
                setKabupaten("Banggai");
                triggerToast("Profil guru diatur ke default", "info");
              }}
              className="text-xs text-slate-300 hover:text-white flex items-center space-x-1 border border-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Profil</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-6 print:p-0 print:m-0">
        
        {/* Banner Alert Print: Only visible in print */}
        <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4">
          <h2 className="text-base font-bold uppercase tracking-wider">KARTU SOAL ASESMEN KURIKULUM MERDEKA</h2>
          <p className="text-xs text-slate-500 mt-1">Dicetak otomatis dari Pembuat Kartu Soal AI</p>
        </div>

        {/* Dashboard grid columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block">
          
          {/* Left Column: Settings Form (5 columns) */}
          <section className="lg:col-span-5 space-y-5 print:hidden">
            
            {/* Quick Templates Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>Pilih Template Tujuan Pembelajaran (TP)</span>
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => selectTemplate(tpl.text, tpl.subject)}
                    className="text-left p-2.5 rounded-lg border border-slate-100 hover:border-sky-300 bg-slate-50 hover:bg-sky-50/40 text-[11px] text-slate-700 hover:text-sky-900 transition flex items-start justify-between group"
                  >
                    <div>
                      <strong className="block text-slate-900 font-semibold group-hover:text-sky-950 mb-0.5">
                        {tpl.subject}
                      </strong>
                      <span className="line-clamp-2 leading-relaxed text-slate-600">{tpl.text}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 ml-2 mt-0.5 text-slate-400 group-hover:text-sky-600 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* Core Settings Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                <span>Parameter Kartu Soal AI</span>
              </h2>

              <form onSubmit={handleGenerate} className="space-y-4">
                
                {/* 1. Header Metadata Section */}
                <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Kop Header & Identitas
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Satuan Kerja / Sekolah
                      </label>
                      <input
                        type="text"
                        value={sekolah}
                        onChange={(e) => setSekolah(e.target.value)}
                        placeholder="Nama Sekolah"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Penulis Kisi-Kisi
                      </label>
                      <input
                        type="text"
                        value={penulis}
                        onChange={(e) => setPenulis(e.target.value)}
                        placeholder="Nama Guru"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Tahun Pelajaran
                      </label>
                      <input
                        type="text"
                        value={tahunPelajaran}
                        onChange={(e) => setTahunPelajaran(e.target.value)}
                        placeholder="Contoh: 2024/2025"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Kabupaten / Kota
                      </label>
                      <input
                        type="text"
                        value={kabupaten}
                        onChange={(e) => setKabupaten(e.target.value)}
                        placeholder="Contoh: Banggai"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Assessment Parameters Section */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Mata Pelajaran
                      </label>
                      <input
                        type="text"
                        value={mataPelajaran}
                        onChange={(e) => setMataPelajaran(e.target.value)}
                        placeholder="Contoh: IPA"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Bahan Kelas / Semester
                      </label>
                      <select
                        value={kelasSemester}
                        onChange={(e) => setKelasSemester(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                      >
                        <option value="7 / Ganjil">Kelas 7 / Ganjil</option>
                        <option value="7 / Genap">Kelas 7 / Genap</option>
                        <option value="8 / Ganjil">Kelas 8 / Ganjil</option>
                        <option value="8 / Genap">Kelas 8 / Genap</option>
                        <option value="9 / Ganjil">Kelas 9 / Ganjil</option>
                        <option value="9 / Genap">Kelas 9 / Genap</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Jenis Soal
                      </label>
                      <select
                        value={jenisSoal}
                        onChange={(e) => setJenisSoal(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                      >
                        <option value="Pilihan Ganda">Pilihan Ganda</option>
                        <option value="Esai / Uraian">Esai / Uraian</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Level Kognitif
                      </label>
                      <select
                        value={levelKognitif}
                        onChange={(e) => setLevelKognitif(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                      >
                        <option value="C1-C2">C1-C2 (Pemahaman)</option>
                        <option value="C3">C3 (Aplikasi)</option>
                        <option value="C4">C4 (Penalaran - HOTS)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Jumlah Soal
                      </label>
                      <select
                        value={jumlahSoal}
                        onChange={(e) => setJumlahSoal(parseInt(e.target.value) || 1)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                      >
                        <option value="1">1 Nomor Soal</option>
                        <option value="2">2 Nomor Soal</option>
                        <option value="3">3 Nomor Soal</option>
                        <option value="5">5 Nomor Soal</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Tujuan Pembelajaran (TP) Input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Isi Alur Tujuan Pembelajaran (ATP / TP)
                  </label>
                  <textarea
                    value={tujuanPembelajaran}
                    onChange={(e) => setTujuanPembelajaran(e.target.value)}
                    rows={4}
                    placeholder="Contoh: Peserta didik mampu menganalisis keterkaitan ekosistem dan dampak pencemaran lingkungan..."
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none leading-relaxed"
                    required
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wide shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 border border-transparent disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{loading ? "Sedang Merumuskan..." : "Racik Kartu Soal AI"}</span>
                </button>

              </form>
            </div>
          </section>

          {/* Right Column: Preview Panel (7 columns) */}
          <section className="lg:col-span-7 print:block">
            
            {/* View container */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 min-h-[580px] flex flex-col justify-between print:border-none print:shadow-none print:p-0">
              
              <div>
                {/* Visual Tab Selection */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5 print:hidden">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Dokumen Pratinjau
                    </h3>
                  </div>

                  {/* Tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-medium text-slate-600">
                    <button
                      onClick={() => setActiveTab("visual")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        activeTab === "visual"
                          ? "bg-white shadow-sm text-slate-950 font-bold"
                          : "hover:text-slate-900"
                      }`}
                    >
                      Formal Kartu Soal
                    </button>
                    <button
                      onClick={() => setActiveTab("markdown")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        activeTab === "markdown"
                          ? "bg-white shadow-sm text-slate-950 font-bold"
                          : "hover:text-slate-900"
                      }`}
                    >
                      Tabel Markdown
                    </button>
                    <button
                      onClick={() => setActiveTab("json")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        activeTab === "json"
                          ? "bg-white shadow-sm text-slate-950 font-bold"
                          : "hover:text-slate-900"
                      }`}
                    >
                      JSON Data
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {!loading && !resultData && (
                  <div className="py-24 text-center text-slate-400 print:hidden">
                    <div className="w-16 h-16 mx-auto mb-4 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                      <FileText className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">Belum Ada Kartu Soal</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                      Lengkapi detail pembelajaran di sebelah kiri lalu klik tombol <strong className="text-sky-600 font-semibold">Racik Kartu Soal AI</strong> untuk mengenerate kartu soal berstandar dinas pendidikan secara instan.
                    </p>
                  </div>
                )}

                {/* Loading State with custom messages */}
                {loading && (
                  <div className="py-24 text-center print:hidden">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                      <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
                      <div className="absolute inset-0 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 tracking-wide">
                      Sedang Merumuskan Kartu Soal...
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 italic leading-relaxed">
                      "{loadingStep}"
                    </p>
                  </div>
                )}

                {/* Result Active Views */}
                {resultData && !loading && (
                  <div>
                    
                    {/* TAB 1: FORMAL PRINT READY SHEET */}
                    {activeTab === "visual" && (
                      <div className="space-y-6 text-slate-900 print:space-y-4">
                        
                        {/* Kop Lembar Kartu Soal */}
                        <div className="text-center border-b-4 double border-slate-900 pb-3 mb-5">
                          <h2 className="text-sm sm:text-base font-bold tracking-wide uppercase font-serif">
                            KARTU SOAL TAHUN PELAJARAN {tahunPelajaran}
                          </h2>
                          <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif text-slate-800 mt-0.5">
                            KABUPATEN {kabupaten.toUpperCase()}
                          </h3>
                        </div>

                        {/* Top Metadata Grid */}
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-900 text-xs font-serif">
                            <tbody>
                              <tr className="border-b border-slate-900">
                                <td className="p-2 bg-slate-100 font-bold w-1/3 border-r border-slate-900">
                                  Satuan Kerja / Sekolah
                                </td>
                                <td className="p-2">{sekolah}</td>
                              </tr>
                              <tr className="border-b border-slate-900">
                                <td className="p-2 bg-slate-100 font-bold border-r border-slate-900">
                                  Penulis Kisi-Kisi
                                </td>
                                <td className="p-2">{penulis}</td>
                              </tr>
                              <tr className="border-b border-slate-900">
                                <td className="p-2 bg-slate-100 font-bold border-r border-slate-900">
                                  Kurikulum
                                </td>
                                <td className="p-2">{kurikulum}</td>
                              </tr>
                              <tr className="border-b border-slate-900">
                                <td className="p-2 bg-slate-100 font-bold border-r border-slate-900">
                                  Bahan Kelas / Semester
                                </td>
                                <td className="p-2">Kelas {kelasSemester}</td>
                              </tr>
                              <tr>
                                <td className="p-2 bg-slate-100 font-bold border-r border-slate-900">
                                  Mata Pelajaran
                                </td>
                                <td className="p-2">{mataPelajaran}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Cognitive Levels Checked Table */}
                        <div className="border border-slate-900 p-3 bg-slate-50/50 text-xs font-serif">
                          <strong className="block mb-2 text-[11px] text-slate-800">
                            Pemetaan Tingkat Kognitif Bloom (Checklist):
                          </strong>
                          <div className="flex flex-wrap gap-4 sm:gap-6">
                            <label className="flex items-center space-x-2 cursor-default">
                              {levelKognitif === "C1-C2" ? (
                                <CheckSquare className="w-4.5 h-4.5 text-slate-900 shrink-0" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                              )}
                              <span className={levelKognitif === "C1-C2" ? "font-bold" : "text-slate-600"}>
                                [X] Pengetahuan / Pemahaman (C1 - C2)
                              </span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-default">
                              {levelKognitif === "C3" ? (
                                <CheckSquare className="w-4.5 h-4.5 text-slate-900 shrink-0" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                              )}
                              <span className={levelKognitif === "C3" ? "font-bold" : "text-slate-600"}>
                                [X] Aplikasi / Penerapan (C3)
                              </span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-default">
                              {levelKognitif === "C4" ? (
                                <CheckSquare className="w-4.5 h-4.5 text-slate-900 shrink-0" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                              )}
                              <span className={levelKognitif === "C4" ? "font-bold" : "text-slate-600"}>
                                [X] Penalaran / HOTS (C4)
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Multiple Cards render per question */}
                        <div className="space-y-8 print:space-y-6">
                          {resultData.daftarSoal.map((q) => (
                            <div
                              key={q.nomorSoal}
                              className="border border-slate-900 p-4 bg-white space-y-4 shadow-sm print:shadow-none print:break-inside-avoid"
                            >
                              {/* Heading badge per question */}
                              <div className="bg-slate-900 text-white px-3 py-1.5 text-xs font-bold font-mono tracking-wide uppercase flex items-center justify-between">
                                <span>KARTU SOAL NOMOR {q.nomorSoal}</span>
                                <span>LEVEL: {q.levelKognitif || levelKognitif}</span>
                              </div>

                              {/* Question Core Parameters Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-900 text-[11px] font-serif">
                                  <tbody>
                                    <tr className="border-b border-slate-900">
                                      <td className="p-2 font-bold bg-slate-50 border-r border-slate-900 w-1/3">
                                        Ruang Lingkup Materi
                                      </td>
                                      <td className="p-2">{q.materiPokok}</td>
                                    </tr>
                                    <tr className="border-b border-slate-900">
                                      <td className="p-2 font-bold bg-slate-50 border-r border-slate-900">
                                        Buku Acuan / Referensi
                                      </td>
                                      <td className="p-2">{q.bukuAcuan}</td>
                                    </tr>
                                    <tr className="border-b border-slate-900">
                                      <td className="p-2 font-bold bg-slate-50 border-r border-slate-900">
                                        Alur Tujuan Pembelajaran (ATP / TP)
                                      </td>
                                      <td className="p-2">{tujuanPembelajaran}</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 font-bold bg-slate-50 border-r border-slate-900 col-span-1">
                                        Indikator Soal (KKO)
                                      </td>
                                      <td className="p-2">{q.indikatorSoal}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Question text box & Key response */}
                              <div className="border border-slate-900 p-3 bg-slate-50/50 space-y-3 font-serif">
                                <div>
                                  <h4 className="font-bold border-b border-slate-300 pb-1 text-slate-900 text-xs uppercase">
                                    BUTIR SOAL NOMOR {q.nomorSoal}:
                                  </h4>
                                  <div className="whitespace-pre-line text-[11.5px] mt-2 leading-relaxed text-slate-900">
                                    {q.soal}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200">
                                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                                    KUNCI JAWABAN / SOLUSI JAWABAN BENAR:
                                  </h4>
                                  <div className="whitespace-pre-line text-[11.5px] text-slate-800 mt-1 leading-relaxed">
                                    {q.kunciJawaban}
                                  </div>
                                </div>
                              </div>

                              {/* Rubrik Penskoran detail table */}
                              <div className="space-y-1.5">
                                <h4 className="font-bold text-xs uppercase text-slate-800 font-serif">
                                  RUBRIK PEDOMAN PENSKORAN SOAL NOMOR {q.nomorSoal}:
                                </h4>
                                <table className="w-full border-collapse border border-slate-900 text-[11px] font-serif">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-900">
                                      <th className="p-2 border-r border-slate-900 text-left">
                                        Kriteria Penilaian / Kata Kunci Indikator
                                      </th>
                                      <th className="p-2 text-center w-28">
                                        Bobot Skor
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {q.pedomanPenskoran.map((p, idx) => (
                                      <tr key={idx} className="border-b border-slate-900">
                                        <td className="p-2 border-r border-slate-900">
                                          {p.kriteria}
                                        </td>
                                        <td className="p-2 text-center font-semibold">
                                          {p.skor}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="font-bold bg-slate-50">
                                      <td className="p-2 text-right border-r border-slate-900 uppercase">
                                        Total Skor Maksimal Soal {q.nomorSoal}:
                                      </td>
                                      <td className="p-2 text-center text-slate-900">
                                        {q.totalSkor}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>

                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                    {/* TAB 2: RAW MARKDOWN CODE */}
                    {activeTab === "markdown" && (
                      <div className="relative">
                        <button
                          onClick={handleCopyMarkdown}
                          className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Markdown</span>
                        </button>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap max-h-[500px] font-mono leading-relaxed">
                          {resultData.markdownTable}
                        </pre>
                      </div>
                    )}

                    {/* TAB 3: RAW JSON CODE */}
                    {activeTab === "json" && (
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap max-h-[500px] font-mono leading-relaxed">
                        {JSON.stringify(resultData, null, 2)}
                      </pre>
                    )}

                  </div>
                )}
              </div>

              {/* Actions Bottom Bar */}
              {resultData && !loading && (
                <div className="border-t border-slate-100 pt-4 mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyMarkdown}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Salin Markdown</span>
                    </button>
                    
                    <button
                      onClick={handleDownloadWord}
                      className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Ekspor ke Word (.doc)</span>
                    </button>
                  </div>

                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak A4 / PDF</span>
                  </button>
                </div>
              )}

            </div>
          </section>

        </div>

        {/* Saved Assessment History Section (Durable Storage) */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Bank Soal Guru (Riwayat Penyimpanan Lokal)
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Seluruh hasil yang Anda generate otomatis tersimpan aman di web browser Anda
                </p>
              </div>
            </div>

            {savedCards.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat bank soal?")) {
                    setSavedCards([]);
                    localStorage.removeItem("pembuat_kartu_soal_bank");
                    triggerToast("Bank soal dikosongkan.", "info");
                  }
                }}
                className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline transition"
              >
                Kosongkan Bank Soal
              </button>
            )}
          </div>

          {savedCards.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <p className="text-xs">Belum ada riwayat kartu soal yang tersimpan.</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Gunakan panel parameter di atas untuk merancang kartu soal baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handleLoadSaved(card)}
                  className="p-3.5 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-white hover:border-sky-400 cursor-pointer transition shadow-sm flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                        {card.payload.mataPelajaran.split(" (")[0]}
                      </span>
                      <span>{card.createdAtLabel}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-sky-950 transition">
                      {card.payload.tujuanPembelajaran}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Kelas {card.payload.kelasSemester} • {card.payload.jenisSoal}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-bold">
                    <span className="text-sky-600 group-hover:text-sky-700 flex items-center space-x-1">
                      <span>Buka Pratinjau</span>
                      <ChevronRight className="w-3 h-3 transition group-hover:translate-x-0.5" />
                    </span>
                    
                    <button
                      onClick={(e) => handleDeleteSaved(card.id, e)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                      title="Hapus dari bank soal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Printable page layouts footer credits */}
      <footer className="mt-auto py-6 border-t border-slate-200/50 bg-white text-center text-[11px] text-slate-400 tracking-wide font-medium print:hidden">
        <p>© 2026 Pembuat Kartu Soal AI • SMP Negeri 2 Kintom</p>
        <p className="mt-0.5 text-[10px] text-slate-500">Format Baku Lampiran Asesmen Kurikulum Merdeka Terintegrasi</p>
      </footer>

    </div>
  );
}
