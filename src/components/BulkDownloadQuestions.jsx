import React, { useState } from "react";
import { db, storage } from "../firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from "docx";
import { toast } from 'react-hot-toast';

const BulkDownloadQuestions = ({ isOpen, onClose, konuId, altKonuId, altDalId }) => {
    const [loading, setLoading] = useState(false);
    const [jsonLoading, setJsonLoading] = useState(false);
    const [sorular, setSorular] = useState([]);
    const [selectedSorular, setSelectedSorular] = useState({});
    const [hepsiSecili, setHepsiSecili] = useState(false);
    const [indirmeTipi, setIndirmeTipi] = useState("tum");
    const [indirmeMiktari, setIndirmeMiktari] = useState("secili");

    // HTML entity'leri düzgün karakterlere çevir
    const decodeHtmlEntities = (text) => {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };

    // Resim URL'lerini HTML'den çıkar
    const extractImageUrls = (html) => {
        if (!html) return [];
        const imgRegex = /<img[^>]+src="([^"]+)"/g;
        const urls = [];
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            urls.push(match[1]);
        }
        return urls;
    };

    // Resmi base64'e çevir (Firebase Storage SDK ile)
    const imageToBase64 = async (url) => {
        try {
            // Firebase Storage URL'sini parse et
            const urlObj = new URL(url);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
            if (!pathMatch) {
                console.error('Geçersiz Firebase Storage URL:', url);
                return null;
            }
            
            const filePath = decodeURIComponent(pathMatch[1]);
            const storageRef = ref(storage, filePath);
            
            // Firebase Storage'dan resmi indir
            const downloadURL = await getDownloadURL(storageRef);
            const response = await fetch(downloadURL);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Resim yüklenirken hata:', error);
            return null;
        }
    };

    // Zorluk normalizasyonu ve emoji eşleşmesi
    const normalizeDifficulty = (raw) => {
        if (!raw) return 'medium';
        const s = String(raw).toLowerCase().trim();
        if ([
            'kolay','easy','e','k','1','low','basit','easy-peasy'
        ].includes(s)) return 'easy';
        if ([
            'zor','hard','z','h','3','difficult','high'
        ].includes(s)) return 'hard';
        // orta/varsayılan
        if ([
            'orta','medium','m','2','mid','normal'
        ].includes(s)) return 'medium';
        return 'medium';
    };

    const difficultyEmoji = (soru) => {
        const raw = soru?.zorluk || soru?.difficulty || soru?.level;
        const norm = normalizeDifficulty(raw);
        if (norm === 'easy') return '🟢';
        if (norm === 'hard') return '🔴';
        return '🟡';
    };

    React.useEffect(() => {
        const fetchQuestions = async () => {
            if (!isOpen) return;
            
            setLoading(true);
            try {
                const soruPath = altDalId 
                    ? ["konular", konuId, "altkonular", altKonuId, "altdallar", altDalId, "sorular"]
                    : ["konular", konuId, "altkonular", altKonuId, "sorular"];
                
                const soruRef = collection(db, ...soruPath);
                const q = query(soruRef, orderBy("soruNumarasi", "asc"));
                const querySnapshot = await getDocs(q);
                
                const soruData = [];
                querySnapshot.forEach((doc) => {
                    soruData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                const siraliSorular = soruData.sort((a, b) => (a.soruNumarasi || 0) - (b.soruNumarasi || 0));
                setSorular(siraliSorular);
                
                setSelectedSorular({});
                setHepsiSecili(false);
                
                console.log("Sorular yüklendi:", soruData.length);
            } catch (error) {
                console.error("Sorular yüklenirken hata oluştu:", error);
                toast.error("Sorular yüklenirken bir hata oluştu!");
            } finally {
                setLoading(false);
            }
        };
        
        fetchQuestions();
    }, [isOpen, konuId, altKonuId, altDalId]);

    const handleSoruToggle = (soruId) => {
        setSelectedSorular(prev => ({
            ...prev,
            [soruId]: !prev[soruId]
        }));
    };

    const handleHepsiToggle = () => {
        const yeniDurum = !hepsiSecili;
        setHepsiSecili(yeniDurum);
        
        const yeniSecimler = {};
        sorular.forEach(soru => {
            yeniSecimler[soru.id] = yeniDurum;
        });
        
        setSelectedSorular(yeniSecimler);
    };

    const seciliSoruSayisi = () => {
        return Object.values(selectedSorular).filter(Boolean).length;
    };

    const handleIndirmeMiktariChange = (miktar) => {
        setIndirmeMiktari(miktar);
        
        if (miktar === "secili") {
            setSelectedSorular({});
            setHepsiSecili(false);
        } else {
            const yeniSecimler = {};
            const secilenMiktar = parseInt(miktar);
            
            sorular.slice(0, secilenMiktar).forEach(soru => {
                yeniSecimler[soru.id] = true;
            });
            
            setSelectedSorular(yeniSecimler);
            setHepsiSecili(false);
        }
    };

    const createDocx = async () => {
        if (loading) {
            console.log("İşlem zaten devam ediyor...");
            return;
        }

        try {
            setLoading(true);
            console.log("Doküman oluşturma başladı");

            // Seçili soruları belirle
            const seciliIDs = Object.entries(selectedSorular)
                .filter(([_, value]) => value)
                .map(([key]) => key);

            let indirilecekSorular = [];
            
            if (indirmeMiktari === "secili") {
                indirilecekSorular = sorular.filter(soru => seciliIDs.includes(soru.id));
            } else {
                const miktar = parseInt(indirmeMiktari);
                indirilecekSorular = sorular.slice(0, miktar);
            }

            if (indirilecekSorular.length === 0) {
                toast.warning("Lütfen indirilecek soruları seçin.");
                setLoading(false);
                return;
            }

            console.log("İndirilecek soru sayısı:", indirilecekSorular.length);

            // Doküman içeriğini oluştur
            const children = [];
            
            // Başlık ekle
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Soru Listesi",
                            bold: true,
                            size: 32,
                            font: "Calibri"
                        })
                    ],
                    spacing: { after: 400 }
                })
            );

            // Her soru için
            for (const soru of indirilecekSorular) {
                try {
                    // Soru numarası ve metni
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `${difficultyEmoji(soru)} Soru ${soru.soruNumarasi || ""}`,
                                    bold: true,
                                    size: 28,
                                    font: "Calibri"
                                })
                            ],
                            spacing: { before: 400, after: 200 }
                        })
                    );

                    // Soru metnini işle
                    const soruMetni = soru.soruMetni || "";
                    const cleanText = decodeHtmlEntities(soruMetni.replace(/<[^>]*>/g, ''));
                    const imageUrls = extractImageUrls(soruMetni);
                    
                    // Metin paragrafı
                    if (cleanText.trim()) {
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: cleanText,
                                        font: "Calibri"
                                    })
                                ],
                                spacing: { after: 200 }
                            })
                        );
                    }
                    
                    // Resimleri ekle
                    for (const imageUrl of imageUrls) {
                        try {
                            const base64Image = await imageToBase64(imageUrl);
                            if (base64Image) {
                                const base64Data = base64Image.split(',')[1];
                                children.push(
                                    new Paragraph({
                                        children: [
                                            new ImageRun({
                                                data: base64Data,
                                                transformation: {
                                                    width: 400,
                                                    height: 300,
                                                },
                                            }),
                                        ],
                                        spacing: { after: 200 }
                                    })
                                );
                            }
                        } catch (error) {
                            console.error('Resim eklenirken hata:', error);
                        }
                    }

                    // Şıklar
                    if (soru.cevaplar && Array.isArray(soru.cevaplar)) {
                        for (let i = 0; i < soru.cevaplar.length; i++) {
                            children.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${String.fromCharCode(65 + i)}) ${decodeHtmlEntities(soru.cevaplar[i] || "")}`,
                                            bold: String.fromCharCode(65 + i) === soru.dogruCevap,
                                            font: "Calibri"
                                        })
                                    ],
                                    spacing: { after: 100 }
                                })
                            );
                        }
                    }

                    // Doğru cevap ve açıklama
                    if (indirmeTipi === "tum") {
                        // Doğru cevabın şıkkını bul
                        const dogruCevapIndex = soru.cevaplar ? soru.cevaplar.findIndex(cevap => cevap === soru.dogruCevap) : -1;
                        const dogruCevapSik = dogruCevapIndex !== -1 ? String.fromCharCode(65 + dogruCevapIndex) : "";

                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Doğru Cevap: ${dogruCevapSik} - ${soru.dogruCevap || ""}`,
                                        bold: true,
                                        color: "2b5797",
                                        font: "Calibri"
                                    })
                                ],
                                spacing: { before: 200, after: 100 }
                            })
                        );

                        if (soru.aciklama) {
                            children.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Açıklama: ",
                                            bold: true,
                                            font: "Calibri"
                                        }),
                                        new TextRun({
                                            text: decodeHtmlEntities(soru.aciklama.replace(/<[^>]*>/g, '')),
                                            font: "Calibri"
                                        })
                                    ],
                                    spacing: { before: 100, after: 400 }
                                })
                            );
                        }
                    }
                } catch (error) {
                    console.error("Soru işlenirken hata:", error);
                    continue;
                }
            }

            console.log("Doküman içeriği hazırlandı, children sayısı:", children.length);

            // Dokümanı oluştur
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: children
                }],
                styles: {
                    default: {
                        document: {
                            run: {
                                font: "Calibri",
                                size: 24
                            }
                        }
                    }
                }
            });

            console.log("Doküman oluşturuldu, blob'a dönüştürülüyor...");

            try {
                // Dokümanı direkt blob'a dönüştür
                const blob = await Packer.toBlob(doc);
                console.log("Blob oluşturuldu, boyut:", blob.size);

                // Dosya adını oluştur
                const fileName = `sorular_${new Date().toISOString().split('T')[0]}.docx`;
                
                // Dosyayı kaydet
                saveAs(blob, fileName);
                console.log("Dosya kaydedildi:", fileName);
                
                toast.success('Sorular başarıyla indirildi!');
            } catch (error) {
                console.error("Dosya indirme hatası:", error);
                throw new Error("Dosya indirme işlemi başarısız oldu: " + error.message);
            }
        } catch (error) {
            console.error("Doküman oluşturulurken hata:", error);
            toast.error("Doküman oluşturulurken bir hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const createJson = async () => {
        if (jsonLoading) {
            console.log("JSON indirme işlemi zaten devam ediyor...");
            return;
        }

        try {
            setJsonLoading(true);
            console.log("JSON oluşturma başladı");

            // Seçili soruları belirle
            const seciliIDs = Object.entries(selectedSorular)
                .filter(([_, value]) => value)
                .map(([key]) => key);

            let indirilecekSorular = [];
            
            if (indirmeMiktari === "secili") {
                indirilecekSorular = sorular.filter(soru => seciliIDs.includes(soru.id));
            } else {
                const miktar = parseInt(indirmeMiktari);
                indirilecekSorular = sorular.slice(0, miktar);
            }

            if (indirilecekSorular.length === 0) {
                toast.warning("Lütfen indirilecek soruları seçin.");
                setJsonLoading(false);
                return;
            }

            console.log("JSON için indirilecek soru sayısı:", indirilecekSorular.length);

            // JSON formatında soruları hazırla (toplu yükleme formatıyla uyumlu)
            const jsonSorular = indirilecekSorular.map(soru => {
                // Options'ı dictionary formatında hazırla
                const options = {};
                if (soru.cevaplar && Array.isArray(soru.cevaplar)) {
                    const harfler = ['A', 'B', 'C', 'D', 'E'];
                    soru.cevaplar.forEach((cevap, index) => {
                        if (index < 5 && cevap) { // Maksimum 5 şık
                            options[harfler[index]] = cevap;
                        }
                    });
                }

                return {
                    question: soru.soruMetni || "",
                    options: options,
                    answer: soru.dogruCevap || "A",
                    explanation: soru.aciklama || ""
                };
            });

            // JSON dosyasını oluştur ve indir
            const jsonContent = JSON.stringify(jsonSorular, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            
            // Dosya adını oluştur
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const fileName = `sorular_${timestamp}.json`;
            
            saveAs(blob, fileName);
            
            toast.success(`${indirilecekSorular.length} soru JSON formatında indirildi!`);
            console.log("JSON indirme tamamlandı");
            
        } catch (error) {
            console.error("JSON oluşturma hatası:", error);
            toast.error("JSON oluşturulurken bir hata oluştu!");
        } finally {
            setJsonLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Toplu Soru İndirme
                    </h2>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-full py-8">
                            <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                            <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">İşlem yapılıyor...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">İndirme Tipi</h3>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="tum"
                                                checked={indirmeTipi === "tum"}
                                                onChange={(e) => setIndirmeTipi(e.target.value)}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">Tüm İçerik</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="sadeceSorular"
                                                checked={indirmeTipi === "sadeceSorular"}
                                                onChange={(e) => setIndirmeTipi(e.target.value)}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">Sadece Sorular</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">İndirme Miktarı</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="secili"
                                                checked={indirmeMiktari === "secili"}
                                                onChange={(e) => handleIndirmeMiktariChange(e.target.value)}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">Seçili Sorular</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="10"
                                                checked={indirmeMiktari === "10"}
                                                onChange={(e) => handleIndirmeMiktariChange(e.target.value)}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">İlk 10 Soru</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="20"
                                                checked={indirmeMiktari === "20"}
                                                onChange={(e) => handleIndirmeMiktariChange(e.target.value)}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">İlk 20 Soru</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="30"
                                                checked={indirmeMiktari === "30"}
                                                onChange={(e) => handleIndirmeMiktariChange(e.target.value)}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">İlk 30 Soru</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="40"
                                                checked={indirmeMiktari === "40"}
                                                onChange={(e) => handleIndirmeMiktariChange(e.target.value)}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">İlk 40 Soru</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 flex justify-between items-center">
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        id="selectAll"
                                        checked={hepsiSecili}
                                        onChange={handleHepsiToggle}
                                        className="form-checkbox text-blue-600"
                                    />
                                    <label htmlFor="selectAll" className="ml-2 text-gray-700 dark:text-gray-300">
                                        Tüm Soruları Seç ({sorular.length})
                                    </label>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300">
                                    {seciliSoruSayisi()} soru seçildi
                                </div>
                            </div>

                            {sorular.length > 0 ? (
                                <div className="space-y-4">
                                    {sorular.map((soru) => (
                                        <div key={soru.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-start">
                                            <input 
                                                type="checkbox" 
                                                id={`soru-${soru.id}`}
                                                checked={!!selectedSorular[soru.id]}
                                                onChange={() => handleSoruToggle(soru.id)}
                                                className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <div className="ml-3 flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <label htmlFor={`soru-${soru.id}`} className="text-base font-medium text-gray-900 dark:text-white">
                                                        <span className="inline-flex items-center justify-center bg-blue-600 text-white font-semibold rounded-full w-6 h-6 mr-2 text-sm">
                                                            {soru.soruNumarasi}
                                                        </span>
                                                        {soru.baslik && <span className="font-semibold mr-2">{soru.baslik}</span>}
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">ID: {soru.id}</span>
                                                    </label>
                                                </div>
                                                <div className="mb-2" dangerouslySetInnerHTML={{ __html: soru.soruMetni }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Henüz soru bulunmamaktadır.
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={loading || jsonLoading}
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => {
                            console.log("JSON İndir butonuna tıklandı");
                            createJson().catch(error => {
                                console.error("JSON indirme işlemi başarısız:", error);
                                toast.error("JSON indirme işlemi başarısız oldu!");
                            });
                        }}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        disabled={jsonLoading || loading || (indirmeMiktari === "secili" && seciliSoruSayisi() === 0)}
                    >
                        {jsonLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>JSON İndiriliyor...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span>JSON İndir</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            console.log("DOCX İndir butonuna tıklandı");
                            createDocx().catch(error => {
                                console.error("DOCX indirme işlemi başarısız:", error);
                                toast.error("DOCX indirme işlemi başarısız oldu!");
                            });
                        }}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        disabled={loading || jsonLoading || (indirmeMiktari === "secili" && seciliSoruSayisi() === 0)}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>DOCX İndiriliyor...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span>DOCX İndir</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDownloadQuestions; 