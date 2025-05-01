import React, { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";
import { toast } from 'react-hot-toast';

const ImportQuestionsFromJSON = ({ isOpen, onClose, currentKonuId, altKonular }) => {
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [jsonFile, setJsonFile] = useState(null);
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
        
        setJsonFile(file);
    };

    // Metindeki \n karakterlerini gerçek yeni satırlara dönüştüren yardımcı fonksiyon
    const processText = (text) => {
        if (!text) return '';
        return text
            .replace(/\\n/g, '\n')  // JSON string içindeki \n'leri gerçek yeni satıra dönüştür
            .replace(/\\/g, '')     // Kalan gereksiz escape karakterlerini temizle
            .trim();                // Baştaki ve sondaki boşlukları temizle
    };

    const importQuestions = async () => {
        if (!selectedAltKonu) {
            toast.warning("Lütfen soruların ekleneceği alt konuyu seçin.");
            return;
        }
        
        if (!jsonFile) {
            toast.warning("Lütfen bir JSON dosyası seçin.");
            return;
        }
        
        setIsUploading(true);
        setImportProgress(0);
        setImportSummary(null);
        setParseErrors([]);
        
        try {
            // JSON dosyasını oku
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const jsonContent = e.target.result;
                    
                    try {
                        // JSON içeriğini parse et
                        let questions = [];
                        const errors = [];
                        
                        try {
                            // JSON verisi bir dizi olabilir veya bir obje içinde dizi olabilir
                            const jsonData = JSON.parse(jsonContent);
                            
                            // Dizi kontrolü
                            if (Array.isArray(jsonData)) {
                                questions = jsonData;
                            } 
                            // Obje içinde dizi kontrolü
                            else if (jsonData.questions && Array.isArray(jsonData.questions)) {
                                questions = jsonData.questions;
                            }
                            // Obje içinde items kontrolü
                            else if (jsonData.items && Array.isArray(jsonData.items)) {
                                questions = jsonData.items;
                            }
                            // Obje içinde data kontrolü
                            else if (jsonData.data && Array.isArray(jsonData.data)) {
                                questions = jsonData.data;
                            }
                            // Tek bir soru objesi de olabilir
                            else if (jsonData.question) {
                                questions = [jsonData];
                            }
                            else {
                                throw new Error("JSON formatı tanınamadı. Soruların bir dizi içinde olması gerekmektedir.");
                            }
                            
                            console.log(`JSON'dan ${questions.length} soru bulundu`);
                        } catch (parseError) {
                            console.error("JSON parse hatası:", parseError);
                            throw new Error("JSON dosyası parse edilemedi: " + parseError.message);
                        }
                        
                        // Her soruyu doğrula ve hazırla
                        const validQuestions = [];
                        
                        for (let i = 0; i < questions.length; i++) {
                            const q = questions[i];
                            
                            try {
                                // Zorunlu alanları kontrol et
                                if (!q.question) {
                                    throw new Error("Soru metni eksik");
                                }
                                
                                // Seçenekleri kontrol et
                                let options = [];
                                if (q.options) {
                                    // Obje ise (A: "Metin", B: "Metin") formatında
                                    if (typeof q.options === 'object' && !Array.isArray(q.options)) {
                                        options = [
                                            processText(q.options.A || q.options.a || ""),
                                            processText(q.options.B || q.options.b || ""),
                                            processText(q.options.C || q.options.c || ""),
                                            processText(q.options.D || q.options.d || ""),
                                            processText(q.options.E || q.options.e || "")
                                        ];
                                    }
                                    // Dizi ise direkt al
                                    else if (Array.isArray(q.options)) {
                                        options = q.options.map(opt => processText(opt)).slice(0, 5);
                                        // Dizi 5'ten az eleman içeriyorsa boş stringlerle tamamla
                                        while (options.length < 5) options.push("");
                                    }
                                } else if (q.choices) {
                                    // Bazı JSON formatlarında 'choices' olarak geçebilir
                                    if (typeof q.choices === 'object' && !Array.isArray(q.choices)) {
                                        options = [
                                            processText(q.choices.A || q.choices.a || ""),
                                            processText(q.choices.B || q.choices.b || ""),
                                            processText(q.choices.C || q.choices.c || ""),
                                            processText(q.choices.D || q.choices.d || ""),
                                            processText(q.choices.E || q.choices.e || "")
                                        ];
                                    } else if (Array.isArray(q.choices)) {
                                        options = q.choices.map(opt => processText(opt)).slice(0, 5);
                                        while (options.length < 5) options.push("");
                                    }
                                } else {
                                    // A, B, C, D, E olarak ayrı alanlar olabilir
                                    options = [
                                        processText(q.A || q.a || q.option_a || q.optionA || ""),
                                        processText(q.B || q.b || q.option_b || q.optionB || ""),
                                        processText(q.C || q.c || q.option_c || q.optionC || ""),
                                        processText(q.D || q.d || q.option_d || q.optionD || ""),
                                        processText(q.E || q.e || q.option_e || q.optionE || "")
                                    ];
                                }
                                
                                // Doğru cevabı belirle
                                let correctAnswer = q.answer || q.correct_answer || q.correctAnswer || "A";
                                
                                // Eğer doğru cevap sayı ise (1, 2, 3...) harfe çevir
                                if (/^[1-5]$/.test(correctAnswer)) {
                                    correctAnswer = String.fromCharCode(65 + parseInt(correctAnswer) - 1); // 1 -> A, 2 -> B
                                }
                                
                                // Harfi büyük harfe çevir
                                correctAnswer = correctAnswer.toUpperCase();
                                
                                // Açıklamayı al
                                const explanation = processText(q.explanation || q.correct_explanation || q.correctExplanation || "");
                                
                                // Soruyu hazırla
                                validQuestions.push({
                                    soruMetni: processText(q.question),
                                    cevaplar: options,
                                    dogruCevap: correctAnswer,
                                    aciklama: explanation
                                });
                                
                            } catch (validationError) {
                                console.warn(`Soru #${i + 1} doğrulanamadı:`, validationError);
                                errors.push({
                                    index: i + 1,
                                    text: `Soru #${i + 1}: ${validationError.message}`
                                });
                            }
                            
                            // İlerleme durumunu güncelle
                            setImportProgress(Math.floor((i + 1) / questions.length * 50));
                        }
                        
                        setParseErrors(errors);
                        
                        if (validQuestions.length === 0) {
                            throw new Error("Geçerli soru bulunamadı. JSON formatını kontrol edin.");
                        }
                        
                        // Firestore'dan mevcut soru sayısını al
                        const soruRef = collection(db, "konular", currentKonuId, "altkonular", selectedAltKonu, "sorular");
                        const q = query(soruRef, orderBy("soruNumarasi", "desc"));
                        const querySnapshot = await getDocs(q);
                        const mevcutSoruSayisi = querySnapshot.empty ? 0 : (querySnapshot.docs[0].data().soruNumarasi || 0);
                        
                        // Başarıyla eklenen soru sayısı
                        let basariliEklenen = 0;
                        let hataOlusan = 0;
                        
                        // Her soruyu veritabanına ekle
                        for (let i = 0; i < validQuestions.length; i++) {
                            const question = validQuestions[i];
                            
                            try {
                                const newQuestion = {
                                    soruMetni: question.soruMetni,
                                    cevaplar: question.cevaplar,
                                    dogruCevap: question.dogruCevap,
                                    aciklama: question.aciklama,
                                    liked: 0,
                                    unliked: 0,
                                    report: 0,
                                    soruNumarasi: mevcutSoruSayisi + i + 1,
                                    soruResmi: null
                                };
                                
                                await addDoc(soruRef, newQuestion);
                                basariliEklenen++;
                            } catch (error) {
                                console.error(`Soru #${i + 1} eklenirken hata:`, error);
                                hataOlusan++;
                            }
                            
                            // İlerleme durumunu güncelle (50-100 arası)
                            setImportProgress(50 + Math.floor((i + 1) / validQuestions.length * 50));
                        }
                        
                        // Özet bilgisi oluştur
                        setImportSummary({
                            toplamBulunan: questions.length,
                            basariliAyrıstırılan: validQuestions.length,
                            basariliEklenen,
                            hataOlusan
                        });
                        
                        if (basariliEklenen > 0) {
                            toast.success(`${basariliEklenen} soru başarıyla eklendi.`);
                        } else {
                            toast.error("Hiçbir soru eklenemedi.");
                        }
                    } catch (error) {
                        console.error("Dosya işleme hatası:", error);
                        toast.error(`Dosya işlenirken bir hata oluştu: ${error.message}`);
                    } finally {
                        setIsUploading(false);
                    }
                } catch (error) {
                    console.error("JSON dönüştürme hatası:", error);
                    toast.error(`JSON dosyası işlenirken bir hata oluştu: ${error.message}`);
                    setIsUploading(false);
                }
            };
            
            reader.onerror = (error) => {
                console.error("Dosya okuma hatası:", error);
                toast.error("Dosya okunamadı.");
                setIsUploading(false);
            };
            
            reader.readAsText(jsonFile);
        } catch (error) {
            console.error("İçe aktarma hatası:", error);
            toast.error(`İçe aktarma sırasında bir hata oluştu: ${error.message}`);
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-3xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        JSON Dosyasından Soruları İçe Aktar
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
                                JSON Dosyası Seçin
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileSelect}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                JSON dosyanızda sorular aşağıdaki formatta olmalıdır:
                            </p>
                            <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
{`[
  {
    "question": "Türkiye, aşağıdaki madenlerden hangisinin dünya rezervlerinin yaklaşık %70'ine sahiptir?",
    "options": {
      "A": "Bor",
      "B": "Demir",
      "C": "Boksit",
      "D": "Krom",
      "E": "Linyit"
    },
    "answer": "A",
    "explanation": "Türkiye, dünya bor rezervlerinin yaklaşık %70'ine sahiptir ve bu alanda liderdir."
  },
  {
    "question": "Diğer soru...",
    "options": {...},
    "answer": "B",
    "explanation": "Açıklama metni..."
  }
]`}
                            </div>
                            <p className="mt-2 text-sm text-text-red-500 dark:text-red-400">
                                <strong>Not:</strong> JSON dosyanızda sorular bir dizi içinde olmalıdır. Her soru için "question", "options", "answer" ve opsiyonel olarak "explanation" alanları bulunmalıdır.
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
                                        <li key={index}>{error.text}</li>
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
                        disabled={isUploading || !jsonFile || !selectedAltKonu}
                        className={`px-6 py-3 rounded-xl ${
                            isUploading || !jsonFile || !selectedAltKonu
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

export default ImportQuestionsFromJSON; 