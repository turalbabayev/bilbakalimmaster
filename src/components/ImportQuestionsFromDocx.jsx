import React, { useState } from "react";
import { database } from "../firebase";
import { ref, push, get } from "firebase/database";
import { Document } from "docx";
import mammoth from "mammoth";

const ImportQuestionsFromDocx = ({ isOpen, onClose, currentKonuId, altKonular }) => {
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [docxFile, setDocxFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importSummary, setImportSummary] = useState(null);
    const [parseErrors, setParseErrors] = useState([]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Dosya boyutu kontrolü (10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            alert("Dosya boyutu çok büyük! Lütfen 10MB'dan küçük bir dosya seçin.");
            return;
        }
        
        setDocxFile(file);
    };

    const parseQuestion = (text) => {
        try {
            console.log("Ayrıştırılacak soru metni:", text.substring(0, 100) + "...");
            
            // Soruyu parçalara ayır
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length < 4) { // En az soru işareti + soru metni + şıklar + doğru cevap
                console.warn("Satır sayısı yetersiz:", lines.length, lines);
                return null;
            }
            
            // İlk satırda genellikle yeşil tik ve Soru numarası olacak - atla
            // Soru metnini bul
            let soruMetni = "";
            let i = 0;
            
            // İlk satırı atla, bu genelde soru başlığı olur
            i = 1;
            
            // Soru metnini al (şıklar başlayana kadar)
            const sikPattern = /^([A-E])\)\s*(.+)$/;
            while (i < lines.length) {
                const line = lines[i].trim();
                
                // Eğer şık satırına geldiysek çık
                if (line.match(sikPattern)) {
                    break;
                }
                
                // Eğer doğru cevap satırına geldiysek çık
                if (line.match(/(✅|🟢|\u2705|Doğru Cevap)/i)) {
                    break;
                }
                
                soruMetni += (soruMetni ? "\n" : "") + line;
                i++;
            }
            
            soruMetni = soruMetni.trim();
            if (!soruMetni) {
                console.warn("Soru metni bulunamadı");
                return null;
            }
            
            // Şıkları al (A, B, C, D, E)
            const cevaplar = ["", "", "", "", ""];
            
            let sikFound = false;
            
            // Şıkları bul
            for (let j = 0; j < 5 && i < lines.length; j++) {
                const line = lines[i].trim();
                const match = line.match(sikPattern);
                
                if (match) {
                    sikFound = true;
                    // Şık sırasını belirle (A=0, B=1, C=2, D=3, E=4)
                    const sikIndex = match[1].charCodeAt(0) - 65;
                    // Şık içeriğini al
                    const sikIcerik = match[2].trim();
                    
                    // Doğru indekse yerleştir
                    if (sikIndex >= 0 && sikIndex < 5) {
                        cevaplar[sikIndex] = sikIcerik;
                    }
                    i++;
                } else if (line.match(/(✅|🟢|\u2705|Doğru Cevap)/i)) {
                    // Şıklardan sonra doğru cevap satırına geldik
                    break;
                } else {
                    // Tanınmayan satır veya başka bir bölüm, ilerle
                    i++;
                    j--; // Şık sayısını artırma
                }
            }
            
            if (!sikFound) {
                console.warn("Hiç şık bulunamadı");
                return null;
            }
            
            // Doğru cevabı al
            let dogruCevap = "";
            let aciklama = "";
            
            // Doğru cevap satırını bul
            let dogruCevapSatiri = "";
            for (let j = i; j < lines.length; j++) {
                if (lines[j].match(/(✅|🟢|\u2705|Doğru Cevap)/i)) {
                    dogruCevapSatiri = lines[j];
                    i = j + 1; // Bir sonraki satırdan devam et
                    break;
                }
            }
            
            // Doğru cevap şıkkını bul
            if (dogruCevapSatiri) {
                // "Doğru Cevap: A)" formatından A'yı çıkar
                const dogruCevapMatch = dogruCevapSatiri.match(/([A-E])\)/);
                if (dogruCevapMatch && dogruCevapMatch[1]) {
                    dogruCevap = dogruCevapMatch[1];
                } else {
                    console.warn("Doğru cevap şıkkı algılanamadı:", dogruCevapSatiri);
                }
            }
            
            // Açıklama bölümünü bul
            for (; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.match(/Açıklama:/i)) {
                    // Açıklama satırını bulduk, bu satırdan itibaren sonuna kadar al
                    aciklama = line.replace(/^Açıklama:\s*/i, "").trim();
                    i++;
                    
                    // Sonraki satırları da açıklamaya ekle
                    while (i < lines.length) {
                        aciklama += "\n" + lines[i].trim();
                        i++;
                    }
                    break;
                }
            }
            
            // Doğru cevap bulunamadıysa varsayılan olarak A şıkkını seç
            if (!dogruCevap) {
                dogruCevap = "A";
                console.warn("Doğru cevap bulunamadı, varsayılan A kullanılıyor");
            }
            
            console.log("Ayrıştırma sonucu:", {
                soruMetni,
                cevaplar,
                dogruCevap,
                aciklama
            });
            
            return {
                soruMetni,
                cevaplar,
                dogruCevap,
                aciklama
            };
        } catch (error) {
            console.error("Soru ayrıştırma hatası:", error);
            return null;
        }
    };

    const importQuestions = async () => {
        if (!selectedAltKonu) {
            alert("Lütfen soruların ekleneceği alt konuyu seçin.");
            return;
        }
        
        if (!docxFile) {
            alert("Lütfen bir DOCX dosyası seçin.");
            return;
        }
        
        setIsUploading(true);
        setImportProgress(0);
        setImportSummary(null);
        setParseErrors([]);
        
        try {
            // DOCX dosyasını oku
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    
                    // Docx içeriğini metne dönüştür
                    const result = await mammoth.extractRawText({
                        arrayBuffer: arrayBuffer
                    });
                    
                    const text = result.value;
                    const warnings = result.messages;
                    
                    if (warnings.length > 0) {
                        console.warn("Docx dönüştürme uyarıları:", warnings);
                    }
                    
                    // Dokümandaki her bir soruyu oluştur
                    console.log("İçe aktarılan metin:", text);
                    
                    // Yeşil tik işareti Unicode'da U+2705 olarak geçiyor, metinde ✅ olarak görünebilir
                    // Hem ✅ hem de 🟢 sembollerini destekle
                    const greenCheckmark = "(✅|🟢|\\u2705|\\u{2705})";
                    
                    try {
                        // Soruları birbirinden ayır
                        const questions = [];
                        const errors = [];
                        
                        // Yazı tipi, Word'den içe aktarma sırasında değişebilir
                        // Önce metin içindeki tüm yeşil tik işaretlerini bul
                        const checkmarks = text.match(new RegExp(greenCheckmark, "gu")) || [];
                        
                        if (checkmarks.length === 0) {
                            console.warn("Metin içinde hiç yeşil tik işareti bulunamadı");
                            throw new Error("Dokümanda yeşil tik (✅) işareti bulunamadı. Soruların yeşil tik işaretiyle başladığından emin olun.");
                        }
                        
                        console.log(`Metin içinde ${checkmarks.length} adet tik işareti bulundu`);
                        
                        // Metni parçalara ayır
                        // Her tik işaretinin konumunu bul
                        const tikPositions = [];
                        const checkmarkRegex = new RegExp(greenCheckmark, "gu");
                        let match;
                        while ((match = checkmarkRegex.exec(text)) !== null) {
                            tikPositions.push(match.index);
                        }
                        
                        // Son konumdan sonrasını da ekle
                        tikPositions.push(text.length);
                        
                        // Her iki tik işareti arasındaki metni bir soru olarak al
                        for (let i = 0; i < tikPositions.length - 1; i++) {
                            const start = tikPositions[i];
                            const end = tikPositions[i + 1];
                            const questionText = text.substring(start, end);
                            
                            // Sorular arasındaki ayraçları ve boşlukları temizle
                            const cleanedText = questionText
                                .replace(/[-_]{3,}/g, "") // Çizgileri temizle
                                .trim();
                            
                            if (cleanedText.length > 0) {
                                console.log(`Soru #${i + 1} metni: ${cleanedText.substring(0, 50)}...`);
                                const parsedQuestion = parseQuestion(cleanedText);
                                
                                if (parsedQuestion) {
                                    questions.push(parsedQuestion);
                                } else {
                                    console.warn(`Soru #${i + 1} ayrıştırılamadı`);
                                    errors.push(`Soru #${i + 1}: Ayrıştırma hatası`);
                                }
                            }
                            
                            // İlerleme durumunu güncelle
                            setImportProgress(Math.floor((i + 1) / (tikPositions.length - 1) * 50));
                        }
                        
                        setParseErrors(errors);
                        
                        if (questions.length === 0) {
                            throw new Error("Ayrıştırılabilir soru bulunamadı. DOCX dosyasının tam olarak beklenen formatta olduğundan emin olun.");
                        }
                        
                        // Firebase'e soruları ekle
                        const soruRef = ref(
                            database,
                            `konular/${currentKonuId}/altkonular/${selectedAltKonu}/sorular`
                        );
                        
                        // Mevcut soru sayısını al
                        const snapshot = await get(soruRef);
                        const sorular = snapshot.val() || {};
                        const mevcutSoruSayisi = Object.keys(sorular).length;
                        
                        // Başarıyla eklenen soru sayısı
                        let basariliEklenen = 0;
                        let hataOlusan = 0;
                        
                        // Her soruyu veritabanına ekle
                        for (let i = 0; i < questions.length; i++) {
                            const question = questions[i];
                            
                            try {
                                const newQuestion = {
                                    soruMetni: question.soruMetni,
                                    cevaplar: question.cevaplar,
                                    dogruCevap: question.dogruCevap,
                                    aciklama: question.aciklama,
                                    liked: 0,
                                    unliked: 0,
                                    report: 0,
                                    soruNumarasi: mevcutSoruSayisi + i + 1
                                };
                                
                                await push(soruRef, newQuestion);
                                basariliEklenen++;
                            } catch (error) {
                                console.error(`Soru #${i + 1} eklenirken hata:`, error);
                                hataOlusan++;
                            }
                            
                            // İlerleme durumunu güncelle (50-100 arası)
                            setImportProgress(50 + Math.floor((i + 1) / questions.length * 50));
                        }
                        
                        // Özet bilgisi oluştur
                        setImportSummary({
                            toplamBulunan: tikPositions.length - 1,
                            basariliAyrıstırılan: questions.length,
                            basariliEklenen,
                            hataOlusan
                        });
                        
                        if (basariliEklenen > 0) {
                            alert(`${basariliEklenen} soru başarıyla eklendi.`);
                        } else {
                            alert("Hiçbir soru eklenemedi.");
                        }
                    } catch (error) {
                        console.error("Dosya işleme hatası:", error);
                        alert(`Dosya işlenirken bir hata oluştu: ${error.message}`);
                    } finally {
                        setIsUploading(false);
                    }
                } catch (error) {
                    console.error("Docx dönüştürme hatası:", error);
                    alert(`DOCX dosyası işlenirken bir hata oluştu: ${error.message}`);
                    setIsUploading(false);
                }
            };
            
            reader.onerror = (error) => {
                console.error("Dosya okuma hatası:", error);
                alert("Dosya okunamadı.");
                setIsUploading(false);
            };
            
            reader.readAsArrayBuffer(docxFile);
        } catch (error) {
            console.error("İçe aktarma hatası:", error);
            alert(`İçe aktarma sırasında bir hata oluştu: ${error.message}`);
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-3xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        DOCX Dosyasından Soruları İçe Aktar
                    </h2>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="space-y-8">
                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Alt Konu Seçin
                            </label>
                            <select
                                value={selectedAltKonu}
                                onChange={(e) => setSelectedAltKonu(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                disabled={isUploading}
                            >
                                <option value="">Alt konu seçin</option>
                                {Object.entries(altKonular).map(([key, altKonu]) => (
                                    <option key={key} value={key}>
                                        {altKonu.baslik}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                DOCX Dosyası Seçin
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="file"
                                        accept=".docx"
                                        onChange={handleFileSelect}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                DOCX dosyanızdaki her soru yeşil tik (✅) işaretiyle başlamalıdır. Örnek:
                            </p>
                            <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                ✅ 2. Soru<br/>
                                Bir otomobil, bir mesafenin ilk yarısını saatte 60 km hızla, ikinci yarısını<br/>
                                ise saatte 90 km hızla gitmiştir. Ortalama hızı saatte kaç km olur?<br/>
                                A) 72<br/>
                                B) 74<br/>
                                C) 75<br/>
                                D) 76<br/>
                                E) 78<br/>
                                ✅ Doğru Cevap: A) 72<br/>
                                Açıklama:<br/>
                                Ortalama hız = 2ab / (a + b)<br/>
                                = 2×60×90 / (60 + 90) = 10800 / 150 = 72 km/s<br/>
                                <br/>
                                ✅ 3. Soru<br/>
                                Bir işçi, bir işi 18 günde, diğer işçi aynı işi 12 günde bitiriyor.<br/>
                                Bu iki işçi birlikte çalışırsa iş kaç günde tamamlanır?<br/>
                                A) 6<br/>
                                B) 7.2<br/>
                                C) 7.5<br/>
                                D) 8<br/>
                                E) 8.5<br/>
                                ✅ Doğru Cevap: D) 8<br/>
                                Açıklama:<br/>
                                Ortak iş süresi = (18 × 12) / (18 + 12) = 216 / 30 = 7.2 gün
                            </div>
                            <p className="mt-2 text-sm text-text-red-500 dark:text-red-400">
                                <strong>Önemli:</strong> Dokümanınızda yeşil tik işareti kullanıldığından emin olun.
                            </p>
                        </div>

                        {isUploading && (
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        İçe Aktarma Durumu
                                    </span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        %{importProgress}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full"
                                        style={{ width: `${importProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {importSummary && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">İçe Aktarma Özeti</h3>
                                <ul className="space-y-1 text-sm">
                                    <li>Toplam bulunan soru: {importSummary.toplamBulunan}</li>
                                    <li>Başarıyla ayrıştırılan: {importSummary.basariliAyrıstırılan}</li>
                                    <li>Başarıyla eklenen: {importSummary.basariliEklenen}</li>
                                    <li>Hata oluşan: {importSummary.hataOlusan}</li>
                                </ul>
                            </div>
                        )}

                        {parseErrors.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800">
                                <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Ayrıştırma Hataları</h3>
                                <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                                    {parseErrors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                        disabled={isUploading}
                    >
                        İptal
                    </button>
                    <button
                        onClick={importQuestions}
                        disabled={isUploading || !docxFile || !selectedAltKonu}
                        className={`px-6 py-3 rounded-xl ${
                            isUploading || !docxFile || !selectedAltKonu
                                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                        } text-white transition-all duration-200 font-medium flex items-center gap-2`}
                    >
                        {isUploading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                İşleniyor...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                İçe Aktar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportQuestionsFromDocx; 