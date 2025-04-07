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
            // Soruyu parçalara ayır
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length < 7) { // En az soru metni + 5 şık + doğru cevap olmalı
                console.warn("Satır sayısı yetersiz:", lines.length, lines);
                return null;
            }
            
            // Soru metnini bul (✅ ve benzeri işaretleri temizle)
            let soruIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("✅") && lines[i].includes("Soru")) {
                    soruIndex = i;
                    break;
                }
            }
            
            if (soruIndex === -1) {
                console.warn("Soru başlangıcı bulunamadı");
                return null;
            }
            
            // Soru metni, soru numarası ifadesini temizleyerek al
            let soruMetni = "";
            let i = soruIndex + 1;
            while (i < lines.length) {
                const line = lines[i].trim();
                // Eğer şık satırına geldiyse çık
                if (line.match(/^[A-E]\)/) || line.match(/^[A-E]\s*\)/)) {
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
            const sikPattern = /^([A-E])\)\s*(.+)$/;
            const sikPattern2 = /^([A-E])\s*\)\s*(.+)$/;
            
            let sikFound = false;
            
            // Soru metninden sonraki satırdan itibaren şıkları ara
            for (let j = 0; j < 5; j++) {
                if (i < lines.length) {
                    let match = lines[i].match(sikPattern) || lines[i].match(sikPattern2);
                    if (match) {
                        sikFound = true;
                        // Şık sırasını belirle (A=0, B=1, C=2, D=3, E=4)
                        const sikIndex = match[1].charCodeAt(0) - 65;
                        // Şık içeriğini al
                        const sikIcerik = match[2].trim();
                        
                        // Doğru indekse yerleştir
                        cevaplar[sikIndex] = sikIcerik;
                    }
                    i++;
                }
            }
            
            if (!sikFound) {
                console.warn("Hiç şık bulunamadı");
                return null;
            }
            
            // Doğru cevabı al
            let dogruCevap = "";
            let aciklama = "";
            
            // Kalan satırlardan doğru cevabı ve açıklamayı bul
            for (; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.includes("Doğru Cevap:") || line.includes("✅ Doğru Cevap:")) {
                    // A) 72 formatından sadece A'yı al
                    const dogruCevapMatch = line.match(/Doğru Cevap:\s*([A-E])\)/);
                    if (dogruCevapMatch && dogruCevapMatch[1]) {
                        dogruCevap = dogruCevapMatch[1];
                    } else {
                        // Doğru cevabı bulamazsa tam formatı yazdır
                        console.warn("Doğru cevap formatı algılanamadı:", line);
                    }
                } else if (line.includes("Açıklama:")) {
                    // Açıklama satırını bulduk, sonraki satırları da ekle
                    aciklama = line.replace(/^Açıklama:\s*/i, "").trim();
                    i++;
                    
                    // Bir sonraki soruya kadar veya boş satırları atla
                    while (i < lines.length) {
                        const nextLine = lines[i].trim();
                        // Eğer yeni bir soru başlıyorsa veya boş satır varsa çık
                        if (nextLine.includes("✅") || nextLine === "") {
                            break;
                        }
                        aciklama += "\n" + nextLine;
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
            
            // Debug için tüm değerleri logla
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
                    
                    // Metni soruları belirten "✅ X. Soru" formatına göre böl
                    const questionRegex = /(✅\s*\d+\.\s*Soru.*?)(?=✅\s*\d+\.\s*Soru|$)/gs;
                    const matches = Array.from(text.matchAll(questionRegex));
                    
                    if (matches.length === 0) {
                        throw new Error("Dokümanda uygun formatta soru bulunamadı. Her soru '✅ X. Soru' formatında başlamalıdır.");
                    }
                    
                    console.log(`${matches.length} adet soru bulundu.`);
                    
                    // Soruları ayrıştır
                    const questions = [];
                    const errors = [];
                    
                    for (let i = 0; i < matches.length; i++) {
                        const questionText = matches[i][1].trim();
                        console.log(`Soru #${i + 1} ayrıştırılıyor:`, questionText.substring(0, 100) + "...");
                        
                        const question = parseQuestion(questionText);
                        
                        if (question) {
                            questions.push(question);
                        } else {
                            errors.push(`Soru #${i + 1}: Ayrıştırma hatası`);
                        }
                        
                        // İlerleme durumunu güncelle
                        setImportProgress(Math.floor((i + 1) / matches.length * 50));
                    }
                    
                    setParseErrors(errors);
                    
                    if (questions.length === 0) {
                        throw new Error("Ayrıştırılabilir soru bulunamadı.");
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
                        toplamBulunan: matches.length,
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
                                DOCX dosyanızdaki her soru "✅ X. Soru" formatında başlamalıdır. Örnek format:
                            </p>
                            <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                ✅ 1. Soru<br/>
                                Soru metni burada<br/>
                                A) Şık 1<br/>
                                B) Şık 2<br/>
                                C) Şık 3<br/>
                                D) Şık 4<br/>
                                E) Şık 5<br/>
                                ✅ Doğru Cevap: A) Şık içeriği<br/>
                                Açıklama:<br/>
                                Açıklama metni burada
                            </div>
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