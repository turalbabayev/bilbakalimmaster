import React, { useState } from "react";
import { database } from "../firebase";
import { ref, get } from "firebase/database";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from "docx";

const BulkDownloadQuestions = ({ isOpen, onClose, konuId, altKonuId, altDalId }) => {
    const [loading, setLoading] = useState(false);
    const [sorular, setSorular] = useState({});
    const [selectedSorular, setSelectedSorular] = useState({});
    const [hepsiSecili, setHepsiSecili] = useState(false);
    const [indirmeTipi, setIndirmeTipi] = useState("tum"); // "tum" veya "sadeceSorular"
    const [indirmeMiktari, setIndirmeMiktari] = useState("secili"); // "secili", "10", "20", "30", "40"

    React.useEffect(() => {
        const fetchQuestions = async () => {
            if (!isOpen) return;
            
            setLoading(true);
            try {
                const soruPath = altDalId 
                    ? `konular/${konuId}/altkonular/${altKonuId}/altdallar/${altDalId}/sorular`
                    : `konular/${konuId}/altkonular/${altKonuId}/sorular`;
                
                const soruRef = ref(database, soruPath);
                const snapshot = await get(soruRef);
                
                if (snapshot.exists()) {
                    setSorular(snapshot.val());
                } else {
                    setSorular({});
                }
                
                setSelectedSorular({});
                setHepsiSecili(false);
            } catch (error) {
                console.error("Sorular yüklenirken hata oluştu:", error);
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
        Object.keys(sorular).forEach(soruId => {
            yeniSecimler[soruId] = yeniDurum;
        });
        
        setSelectedSorular(yeniSecimler);
    };

    const seciliSoruSayisi = () => {
        return Object.values(selectedSorular).filter(Boolean).length;
    };

    const handleIndirmeMiktariChange = (miktar) => {
        setIndirmeMiktari(miktar);
        
        if (miktar === "secili") {
            // Seçili modunda tüm seçimleri temizle
            setSelectedSorular({});
            setHepsiSecili(false);
        } else {
            // İlk N soruyu seç (sıralı olarak)
            const yeniSecimler = {};
            // Önce sıralı sorular listesini al
            const siralanmisSorular = sortedQuestions(sorular);
            const secilenMiktar = parseInt(miktar);
            
            // Sadece ilk N sıralı soruyu seç
            siralanmisSorular.slice(0, secilenMiktar).forEach(([soruId]) => {
                yeniSecimler[soruId] = true;
            });
            
            setSelectedSorular(yeniSecimler);
            setHepsiSecili(false);
        }
    };

    const createDocx = async () => {
        const seciliIDs = Object.entries(selectedSorular)
            .filter(([_, value]) => value)
            .map(([key]) => key);

        let indirilecekSorular = {};
        
        if (indirmeMiktari === "secili") {
            indirilecekSorular = seciliIDs.reduce((acc, id) => {
                acc[id] = sorular[id];
                return acc;
            }, {});
        } else {
            // İlk N soruyu al (sıralı olarak)
            const miktar = parseInt(indirmeMiktari);
            const siralanmisSorular = sortedQuestions(sorular);
            
            indirilecekSorular = siralanmisSorular
                .slice(0, miktar)
                .reduce((acc, [id, soru]) => {
                    acc[id] = soru;
                    return acc;
                }, {});
        }

        // Soruları soru numarasına göre sıralama
        const sortedSorular = Object.entries(indirilecekSorular).sort((a, b) => {
            const numA = a[1].soruNumarasi || 0;
            const numB = b[1].soruNumarasi || 0;
            return numA - numB;
        });

        const children = [];
        
        sortedSorular.forEach(([soruId, soru], index) => {
            // Soru başlığı
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${index + 1}. Soru`,
                            bold: true,
                            size: 24,
                        }),
                    ],
                    spacing: {
                        after: 200,
                    },
                })
            );

            // Soru metni
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: soru.soruMetni.replace(/<[^>]*>/g, ''),
                            size: 20,
                        }),
                    ],
                    spacing: {
                        after: 200,
                    },
                })
            );

            // Şıklar
            const cevapTable = new Table({
                rows: soru.cevaplar.map((cevap, i) => {
                    const harf = String.fromCharCode(65 + i);
                    return new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `${harf})`,
                                                bold: true,
                                            }),
                                        ],
                                    }),
                                ],
                                width: {
                                    size: 500,
                                    type: WidthType.DXA,
                                },
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: cevap,
                                            }),
                                        ],
                                    }),
                                ],
                                width: {
                                    size: 5000,
                                    type: WidthType.DXA,
                                },
                            }),
                        ],
                    });
                }),
            });

            children.push(cevapTable);

            if (indirmeTipi === "tum") {
                // Doğru cevap ve şık harfi
                const dogruCevapIndex = soru.cevaplar.indexOf(soru.dogruCevap);
                const dogruCevapHarfi = String.fromCharCode(65 + dogruCevapIndex);
                
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Doğru Cevap: ${soru.dogruCevap} (${dogruCevapHarfi})`,
                                bold: true,
                                color: "008000",
                            }),
                        ],
                        spacing: {
                            before: 200,
                            after: 200,
                        },
                    })
                );

                // Açıklama
                if (soru.aciklama) {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Açıklama: ${soru.aciklama}`,
                                    color: "0000FF",
                                }),
                            ],
                            spacing: {
                                before: 200,
                                after: 400,
                            },
                        })
                    );
                }
            }

            // Sayfa sonu (son soru hariç)
            if (index < sortedSorular.length - 1) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "",
                                break: 1,
                            }),
                        ],
                    })
                );
            }
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
        });

        const buffer = await Packer.toBlob(doc);
        
        // Dosya adını oluştur
        const konuAdi = altDalId 
            ? `konular/${konuId}/altkonular/${altKonuId}/altdallar/${altDalId}/baslik`
            : `konular/${konuId}/altkonular/${altKonuId}/baslik`;
        
        const konuRef = ref(database, konuAdi);
        const konuSnapshot = await get(konuRef);
        const konuBaslik = konuSnapshot.exists() ? konuSnapshot.val() : "Bilinmeyen Konu";
        
        const indirmeTipiMetni = indirmeTipi === "tum" ? "tum-aciklamalar-dahil" : "sadece-cevaplar";
        const indirmeMiktariMetni = indirmeMiktari === "secili" 
            ? `secili-${seciliSoruSayisi()}-soru` 
            : `ilk-${indirmeMiktari}-soru`;
        
        const dosyaAdi = `${konuBaslik}-${indirmeMiktariMetni}-${indirmeTipiMetni}.docx`;
        
        saveAs(buffer, dosyaAdi);
    };

    // Soruları sıralama fonksiyonu - UI'da kullanmak için
    const sortedQuestions = (questions) => {
        if (!questions) return [];
        return Object.entries(questions).sort((a, b) => {
            const numA = a[1].soruNumarasi || 0;
            const numB = b[1].soruNumarasi || 0;
            return numA - numB;
        });
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
                            
                            <div className="mb-4 flex items-center justify-between">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hepsiSecili}
                                        onChange={handleHepsiToggle}
                                        className="form-checkbox text-blue-600"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">Tümünü Seç</span>
                                </label>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {seciliSoruSayisi()} soru seçildi
                                </span>
                            </div>
                            
                            <div className="space-y-4">
                                {sortedQuestions(sorular).map(([soruId, soru], index) => (
                                    <div key={soruId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <div className="flex items-start space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedSorular[soruId] || false}
                                                onChange={() => handleSoruToggle(soruId)}
                                                className="form-checkbox text-blue-600 mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {index + 1}. Soru {soru.soruNumarasi ? `(No: ${soru.soruNumarasi})` : ''}
                                                    </span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        Doğru Cevap: {soru.dogruCevap}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-gray-700 dark:text-gray-300">
                                                    {soru.soruMetni.replace(/<[^>]*>/g, '')}
                                                </p>
                                                <div className="mt-3 space-y-2">
                                                    {soru.cevaplar.map((cevap, i) => (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <span className="text-gray-500 dark:text-gray-400 w-6">
                                                                {String.fromCharCode(65 + i)})
                                                            </span>
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                {cevap}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {soru.aciklama && (
                                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                                            Açıklama: {soru.aciklama}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={createDocx}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        disabled={loading || (indirmeMiktari === "secili" && seciliSoruSayisi() === 0)}
                    >
                        {loading ? "İndiriliyor..." : "İndir"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDownloadQuestions; 