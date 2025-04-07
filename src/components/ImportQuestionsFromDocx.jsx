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
            
            // Tek satırsa bile ayrıştırmayı dene
            if (text.includes("Doğru Cevap:") && text.includes("Açıklama:")) {
                // Özel durum: Tüm içerik tek satırda
                // Örnek: "✅ Doğru Cevap: D) 12Açıklama:Kısa kenar = x, uzun kenar = 3xÇevre: 2(x + 3x) = 8x = 96 → x = 12"
                
                // Parçalara ayır
                const soruMatch = text.match(/(✅|🟢|\u2705|\*|□|■|√|•|\u2713|\u2714|\u2611)\s*(\d+)[\.\)\s]*Soru\s*(.*?)((?:A[\.\)]|B[\.\)]|C[\.\)]|D[\.\)]|E[\.\)]|1[\.\)]|2[\.\)]|3[\.\)]|4[\.\)]|5[\.\)]|I[\.\)]|II[\.\)]|III[\.\)]|IV[\.\)]|V[\.\)]|VI[\.\)]))/s);
                let soruMetni = "";
                
                if (soruMatch) {
                    soruMetni = soruMatch[3].trim();
                }
                
                // Şıkları bul - farklı format seçeneklerini destekle
                const cevaplar = ["", "", "", "", ""];
                
                // A), B), C) şeklindeki harf şıkları
                const sikMatches = text.match(/([A-E])[\.)\s]+([^A-E)\.\n✅🟢\*□■√•\u2713\u2714\u2611]*)/g) || [];
                
                // 1), 2), 3) şeklindeki sayı şıkları
                const numericMatches = text.match(/([1-5])[\.)\s]+([^1-5)\.\n✅🟢\*□■√•\u2713\u2714\u2611]*)/g) || [];
                
                // I), II), III) şeklindeki roma rakamları şıkları
                const romanMatches = text.match(/(I{1,3}|IV|V|VI)[\.)\s]+([^I)\.\n✅🟢\*□■√•\u2713\u2714\u2611]*)/g) || [];
                
                // Harf şıkları
                for (const sikMatch of sikMatches) {
                    const match = sikMatch.match(/([A-E])[\.)\s]+(.*)/);
                    if (match) {
                        const sikIndex = match[1].charCodeAt(0) - 65;
                        if (sikIndex >= 0 && sikIndex < 5) {
                            cevaplar[sikIndex] = match[2].trim();
                        }
                    }
                }
                
                // Sayı şıkları (eğer harf şıkları bulunamadıysa)
                if (sikMatches.length === 0 && numericMatches.length > 0) {
                    for (const sikMatch of numericMatches) {
                        const match = sikMatch.match(/([1-5])[\.)\s]+(.*)/);
                        if (match) {
                            const sikIndex = parseInt(match[1]) - 1;
                            if (sikIndex >= 0 && sikIndex < 5) {
                                cevaplar[sikIndex] = match[2].trim();
                            }
                        }
                    }
                }
                
                // Roma şıkları (eğer diğer şıklar bulunamadıysa)
                if (sikMatches.length === 0 && numericMatches.length === 0 && romanMatches.length > 0) {
                    const romanToIndex = {
                        'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5
                    };
                    
                    for (const sikMatch of romanMatches) {
                        const match = sikMatch.match(/(I{1,3}|IV|V|VI)[\.)\s]+(.*)/);
                        if (match) {
                            const sikIndex = romanToIndex[match[1]];
                            if (sikIndex !== undefined && sikIndex >= 0 && sikIndex < 5) {
                                cevaplar[sikIndex] = match[2].trim();
                            }
                        }
                    }
                }
                
                // Doğru cevabı bul - daha fazla format desteği ekle
                const dogruCevapFormats = [
                    /Doğru Cevap:?\s*([A-E])[\.\)]/i,   // Harf formatı
                    /Doğru Cevap:?\s*([1-5])[\.\)]/i,   // Sayı formatı
                    /Doğru Cevap:?\s*(I{1,3}|IV|V|VI)[\.\)]/i,  // Roma formatı
                    /Cevap:?\s*([A-E])[\.\)]/i,         // Sadece "Cevap:" ile
                    /Çözüm:?\s*([A-E])[\.\)]/i          // "Çözüm:" ile
                ];
                
                let dogruCevap = "A"; // Varsayılan
                
                for (const format of dogruCevapFormats) {
                    const dogruCevapMatch = text.match(format);
                    if (dogruCevapMatch) {
                        const cevap = dogruCevapMatch[1];
                        
                        // Harfse direkt al
                        if (/^[A-E]$/.test(cevap)) {
                            dogruCevap = cevap;
                            break;
                        }
                        
                        // Sayıysa harfe çevir
                        if (/^[1-5]$/.test(cevap)) {
                            dogruCevap = String.fromCharCode(65 + parseInt(cevap) - 1);
                            break;
                        }
                        
                        // Roma rakamıysa harfe çevir
                        const romanToLetter = {
                            'I': 'A', 'II': 'B', 'III': 'C', 'IV': 'D', 'V': 'E', 'VI': 'F'
                        };
                        if (romanToLetter[cevap]) {
                            dogruCevap = romanToLetter[cevap];
                            break;
                        }
                    }
                }
                
                // Açıklamayı bul
                const aciklamaMatch = text.match(/Açıklama:?(.*?)(?=(✅|🟢|\u2705|\*|□|■|√|•|\u2713|\u2714|\u2611|\s*\d+\.\s*Soru)|$)/is);
                const aciklama = aciklamaMatch ? aciklamaMatch[1].trim() : "";
                
                // Soru metni veya şıklar yoksa hata döndür
                if (!soruMetni) {
                    console.warn("Tek satır modunda soru metni bulunamadı");
                    return null;
                }
                
                // Şıklar bulunamadıysa bile devam et
                if (sikMatches.length === 0 && numericMatches.length === 0 && romanMatches.length === 0) {
                    console.warn("Şıklar bulunamadı ama devam ediliyor");
                }
                
                return {
                    soruMetni,
                    cevaplar,
                    dogruCevap,
                    aciklama
                };
            }
            
            // Soruyu parçalara ayır
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length < 3) { // En az soru başlığı, soru metni ve bir şık olmalı
                console.warn("Satır sayısı yetersiz:", lines.length, lines);
                
                // Son bir şans olarak tek satır modunu deneyelim
                if (lines.length === 1 && lines[0].includes("Soru") && lines[0].includes(")")) {
                    // Tek satırda olabilir
                    const line = lines[0];
                    
                    // Soru metnini, şıkları ve doğru cevabı çıkarmaya çalış
                    const soruMatch = line.match(/(✅|🟢|\u2705|\*|□|■|√|•|\u2713|\u2714|\u2611)\s*\d+[\.\)]\s*Soru\s*(.*?)([A-E][\.\)])/);
                    if (soruMatch) {
                        const soruMetni = soruMatch[2].trim();
                        
                        // Şıkları ve doğru cevabı bul
                        const cevaplar = ["", "", "", "", ""];
                        const dogruCevap = "A"; // Varsayılan
                        
                        return {
                            soruMetni,
                            cevaplar,
                            dogruCevap,
                            aciklama: ""
                        };
                    }
                }
                
                return null;
            }
            
            // İlk satırda genellikle yeşil tik ve Soru numarası olacak
            // Soru metnini bul
            let soruMetni = "";
            let i = 0;
            
            // Soru numarası içeren satırı bul
            const soruBaslikPattern = /(✅|🟢|\u2705|\*|□|■|√|•|\u2713|\u2714|\u2611)?\s*\d+[\.\)]\s*Soru/i;
            
            if (lines[0].match(soruBaslikPattern)) {
                // İlk satır soru başlığı, soru metninin başlangıcını bul
                if (lines.length > 1) {
                    // İkinci satırdan itibaren soru metni
                    i = 1;
                } else {
                    // Soru başlığını ayır ve metni çıkar
                    const baslikParts = lines[0].split("Soru");
                    if (baslikParts.length > 1) {
                        soruMetni = baslikParts[1].trim();
                    }
                    i = lines.length; // İşlemi bitir
                }
            } else {
                // Soru başlığı yok, ilk satırdan başla
                i = 0;
            }
            
            // Soru metnini al (şıklar başlayana kadar)
            const sikPattern = /^([A-E]|[1-5]|I{1,3}|IV|V|VI)[\.\)]\s*(.+)$/;
            while (i < lines.length) {
                const line = lines[i].trim();
                
                // Eğer şık satırına geldiysek çık
                if (line.match(sikPattern)) {
                    break;
                }
                
                // Eğer doğru cevap satırına geldiysek çık
                if (line.match(/(✅|🟢|\u2705|\*|□|■|√|•|\u2713|\u2714|\u2611|Doğru Cevap|Cevap|Çözüm)/i)) {
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
            
            // Şıkları al (A, B, C, D, E veya sayısal/roma şıkları)
            const cevaplar = ["", "", "", "", ""];
            
            let sikFound = false;
            
            // Şıkları bul
            while (i < lines.length) {
                const line = lines[i].trim();
                
                // Harf şıkları kontrolü
                const harfMatch = line.match(/^([A-E])[\.\)]\s*(.+)$/);
                if (harfMatch) {
                    sikFound = true;
                    const sikIndex = harfMatch[1].charCodeAt(0) - 65;
                    if (sikIndex >= 0 && sikIndex < 5) {
                        cevaplar[sikIndex] = harfMatch[2].trim();
                    }
                    i++;
                    continue;
                }
                
                // Sayı şıkları kontrolü
                const numericMatch = line.match(/^([1-5])[\.\)]\s*(.+)$/);
                if (numericMatch) {
                    sikFound = true;
                    const sikIndex = parseInt(numericMatch[1]) - 1;
                    if (sikIndex >= 0 && sikIndex < 5) {
                        cevaplar[sikIndex] = numericMatch[2].trim();
                    }
                    i++;
                    continue;
                }
                
                // Roma rakamları şıkları kontrolü
                const romaMatch = line.match(/^(I{1,3}|IV|V|VI)[\.\)]\s*(.+)$/);
                if (romaMatch) {
                    sikFound = true;
                    const romaSiklar = {'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5};
                    const sikIndex = romaSiklar[romaMatch[1]];
                    if (sikIndex !== undefined && sikIndex >= 0 && sikIndex < 5) {
                        cevaplar[sikIndex] = romaMatch[2].trim();
                    }
                    i++;
                    continue;
                }
                
                // Doğru cevap veya başka bölüm kontrolü
                if (line.match(/(✅|🟢|\u2705|\*|□|■|√|•|\u2713|\u2714|\u2611|Doğru Cevap|Cevap|Çözüm)/i)) {
                    break;
                }
                
                // Tanınmayan satır, ilerle
                i++;
            }
            
            // Soru şıkları bulunamazsa bile devam etmeyi dene
            if (!sikFound) {
                console.warn("Hiç şık bulunamadı, şıksız devam ediliyor");
            }
            
            // Doğru cevabı al
            let dogruCevap = "";
            let aciklama = "";
            
            // Doğru cevap satırını bul
            let dogruCevapSatiri = "";
            for (let j = i; j < lines.length; j++) {
                if (lines[j].match(/(Doğru Cevap|Cevap|Çözüm)/i)) {
                    dogruCevapSatiri = lines[j];
                    i = j + 1; // Bir sonraki satırdan devam et
                    break;
                }
            }
            
            // Doğru cevap şıkkını bul
            if (dogruCevapSatiri) {
                // Çeşitli formatları dene
                const formatlar = [
                    /[^A-Z]([A-E])[\.\)]/,             // Harf formatı (A),A.,A)
                    /[^0-9]([1-5])[\.\)]/,             // Sayı formatı (1),1.,1)
                    /[^I](I{1,3}|IV|V|VI)[\.\)]/,      // Roma formatı (I),I.,I)
                    /^Doğru Cevap:?\s*([A-E])[\.\)]/i, // "Doğru Cevap: A)" formatı
                    /^Cevap:?\s*([A-E])[\.\)]/i,       // "Cevap: A)" formatı
                    /^Çözüm:?\s*([A-E])[\.\)]/i        // "Çözüm: A)" formatı
                ];
                
                for (const format of formatlar) {
                    const match = dogruCevapSatiri.match(format);
                    if (match && match[1]) {
                        const cevap = match[1];
                        
                        // Harfse direkt kullan
                        if (/^[A-E]$/.test(cevap)) {
                            dogruCevap = cevap;
                            break;
                        }
                        
                        // Sayıysa harfe çevir
                        if (/^[1-5]$/.test(cevap)) {
                            dogruCevap = String.fromCharCode(65 + parseInt(cevap) - 1);
                            break;
                        }
                        
                        // Roma rakamıysa harfe çevir
                        const romaHarfler = {'I': 'A', 'II': 'B', 'III': 'C', 'IV': 'D', 'V': 'E'};
                        if (romaHarfler[cevap]) {
                            dogruCevap = romaHarfler[cevap];
                            break;
                        }
                    }
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
            
            // Açıklama bulunamadıysa, doğru cevap satırının devamına bakabiliriz
            if (!aciklama && dogruCevapSatiri) {
                const aciklamaParts = dogruCevapSatiri.split("Açıklama:");
                if (aciklamaParts.length > 1) {
                    aciklama = aciklamaParts[1].trim();
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
                    
                    // Karakterlerin Unicode kodlarını görmek için
                    const firstFewChars = text.substring(0, 200);
                    console.log("İlk birkaç karakter:", firstFewChars);
                    console.log("Unicode kodları:");
                    for(let i=0; i < Math.min(200, text.length); i++) {
                        const char = text.charAt(i);
                        const code = text.charCodeAt(i);
                        if (code > 127) { // ASCII olmayan karakterler
                            console.log(`Pozisyon ${i}: '${char}' - Unicode: U+${code.toString(16).padStart(4, '0')}`);
                        }
                    }
                    
                    // Olası tik işaretlerini kontrol et
                    const checkPatterns = [
                        {pattern: /[\u2705]/g, name: "Yeşil Tik (U+2705)"},
                        {pattern: /[\u2714]/g, name: "Tik İşareti (U+2714)"},
                        {pattern: /[\u2713]/g, name: "Kontrol İşareti (U+2713)"},
                        {pattern: /[\u2611]/g, name: "Tikli Kutu (U+2611)"},
                        {pattern: /[\uD83D][\uDC4D]/g, name: "Başparmak Yukarı (U+1F44D)"},
                        {pattern: /[\uD83D][\uDFE2]/g, name: "Yeşil Daire (U+1F7E2)"}
                    ];
                    
                    for (const {pattern, name} of checkPatterns) {
                        const matches = text.match(pattern) || [];
                        if (matches.length > 0) {
                            console.log(`${name} bulundu: ${matches.length} adet`);
                        }
                    }
                    
                    // Dokümandaki her bir soruyu oluştur
                    console.log("İçe aktarılan metin:", text);
                    
                    // Yeşil tik işareti Unicode'da U+2705 olarak geçiyor, metinde ✅ olarak görünebilir
                    // Hem ✅ hem de 🟢 sembollerini ve diğer olası işaretleri destekle
                    const greenCheckmark = "(✅|🟢|\\u2705|\\u{2705}|✓|\\u2714|\\u{2714}|\\u2713|\\u{2713}|\\u2611|\\u{2611}|☑|\\uD83D\\uDFE2|\\uD83D\\uDC4D|•|\\*|□|■|√)";
                    
                    try {
                        // Soruları birbirinden ayır
                        const questions = [];
                        const errors = [];
                        
                        // Metni daha esnek bir şekilde parçalara ayır
                        // Her soru işaretinin konumunu bul
                        const tikPositions = [];
                        
                        // Farklı soru başlangıç formatlarını dene
                        const checkmarkRegex = new RegExp(`${greenCheckmark}\\s*\\d+\\.\\s*Soru`, "gu");
                        const altCheckmarkRegex = new RegExp(`${greenCheckmark}\\s*Soru\\s*\\d+`, "gu");
                        const numberOnlyRegex = /\b\d+\.\s*Soru\b/gu;
                        
                        let match;
                        // İşaretli ve numaralı sorular (✅ 1. Soru)
                        while ((match = checkmarkRegex.exec(text)) !== null) {
                            tikPositions.push(match.index);
                        }
                        
                        // Alternatif format (✅ Soru 1)
                        if (tikPositions.length === 0) {
                            while ((match = altCheckmarkRegex.exec(text)) !== null) {
                                tikPositions.push(match.index);
                            }
                        }
                        
                        // Eğer hiç işaretli soru bulunamazsa, sadece numaralı soruları dene
                        if (tikPositions.length === 0) {
                            console.warn("İşaretli soru bulunamadı, sadece numaralı soruları deniyorum");
                            while ((match = numberOnlyRegex.exec(text)) !== null) {
                                tikPositions.push(match.index);
                            }
                        }
                        
                        // Hala hiç soru başlangıcı bulunamadıysa son çare olarak sadece tik işaretlerini dene
                        if (tikPositions.length === 0) {
                            console.warn("Numaralı sorular bulunamadı, sadece tik işaretlerini deniyorum");
                            const onlyCheckmarkRegex = new RegExp(greenCheckmark, "gu");
                            while ((match = onlyCheckmarkRegex.exec(text)) !== null) {
                                tikPositions.push(match.index);
                            }
                        }
                        
                        console.log(`${tikPositions.length} adet olası soru başlangıcı bulundu`);
                        
                        if (tikPositions.length === 0) {
                            throw new Error("Soru başlangıçları tanınamadı. Lütfen DOCX dosyasını kontrol edin.");
                        }
                        
                        // Son konumdan sonrasını da ekle (metin sonuna kadar)
                        tikPositions.push(text.length);
                        
                        // Tüm soruları ayrıştır
                        for (let i = 0; i < tikPositions.length - 1; i++) {
                            const start = tikPositions[i];
                            const end = tikPositions[i + 1];
                            const questionText = text.slice(start, end).trim();
                            
                            // Soru metnini ayrıştır
                            const parsedQuestion = parseQuestion(questionText);
                            
                            if (parsedQuestion) {
                                questions.push(parsedQuestion);
                            } else {
                                console.warn(`#${i + 1} numaralı soru ayrıştırılamadı:`);
                                console.warn(questionText.substring(0, 100) + "...");
                                errors.push({
                                    index: i + 1,
                                    text: questionText.substring(0, 100) + "..."
                                });
                            }
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
                                DOCX dosyanızdaki her soru yeşil tik (✅) işaretiyle başlamalıdır. Örnek format:
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
                            </div>
                            <p className="mt-2 text-sm text-text-red-500 dark:text-red-400">
                                <strong>Önemli:</strong> DOCX içindeki her soru başlangıcında ve doğru cevap kısmında yeşil tik işareti (✅) kullanılması gereklidir. Sorun yaşıyorsanız, DOCX dosyanızı Word'de açıp yeşil tik işaretlerini kontrol edin veya yeniden ekleyin (Emoji → ✓ veya ✅ seçerek).
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