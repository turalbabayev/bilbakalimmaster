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
            const miktar = parseInt(indirmeMiktari);
            const soruArray = Object.entries(sorular);
            indirilecekSorular = soruArray
                .slice(0, miktar)
                .reduce((acc, [id, soru]) => {
                    acc[id] = soru;
                    return acc;
                }, {});
        }

        const children = [];
        
        Object.entries(indirilecekSorular).forEach(([soruId, soru], index) => {
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
                // Doğru cevap
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Doğru Cevap: ${soru.dogruCevap}`,
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
            if (index < Object.keys(indirilecekSorular).length - 1) {
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
        saveAs(buffer, `sorular_${new Date().toISOString().split('T')[0]}.docx`);
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
                            <div className="mb-6 flex flex-col space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id="selectAll"
                                            checked={hepsiSecili}
                                            onChange={handleHepsiToggle}
                                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <label htmlFor="selectAll" className="ml-2 text-base font-medium text-gray-900 dark:text-gray-300">
                                            Tüm Soruları Seç ({Object.keys(sorular).length})
                                        </label>
                                    </div>
                                    <div className="text-base font-medium text-gray-900 dark:text-gray-300">
                                        {seciliSoruSayisi()} soru seçildi
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <label className="text-base font-medium text-gray-900 dark:text-gray-300">
                                        İndirme Tipi:
                                    </label>
                                    <select
                                        value={indirmeTipi}
                                        onChange={(e) => setIndirmeTipi(e.target.value)}
                                        className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                    >
                                        <option value="tum">Tüm Sorular (Cevaplar ve Açıklamalar Dahil)</option>
                                        <option value="sadeceSorular">Sadece Sorular ve Şıklar</option>
                                    </select>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <label className="text-base font-medium text-gray-900 dark:text-gray-300">
                                        İndirme Miktarı:
                                    </label>
                                    <select
                                        value={indirmeMiktari}
                                        onChange={(e) => setIndirmeMiktari(e.target.value)}
                                        className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                    >
                                        <option value="secili">Seçili Sorular</option>
                                        <option value="10">İlk 10 Soru</option>
                                        <option value="20">İlk 20 Soru</option>
                                        <option value="30">İlk 30 Soru</option>
                                        <option value="40">İlk 40 Soru</option>
                                    </select>
                                </div>
                            </div>
                            
                            {Object.keys(sorular).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(sorular).map(([soruId, soru], index) => (
                                        <div key={soruId} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-start">
                                            <input 
                                                type="checkbox" 
                                                id={`soru-${soruId}`}
                                                checked={!!selectedSorular[soruId]}
                                                onChange={() => handleSoruToggle(soruId)}
                                                className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <div className="ml-3 flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <label htmlFor={`soru-${soruId}`} className="text-base font-medium text-gray-900 dark:text-white">
                                                        <span className="inline-flex items-center justify-center bg-blue-600 text-white font-semibold rounded-full w-6 h-6 mr-2 text-sm">
                                                            {index + 1}
                                                        </span>
                                                        {soru.baslik && <span className="font-semibold mr-2">{soru.baslik}</span>}
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">ID: {soruId}</span>
                                                    </label>
                                                    {soru.siraNo && (
                                                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-md">
                                                            Sıra: {soru.siraNo}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mb-2" dangerouslySetInnerHTML={{ __html: soru.soruMetni }} />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                    {soru.cevaplar?.map((cevap, index) => (
                                                        <div 
                                                            key={index} 
                                                            className={`p-2 text-sm rounded ${
                                                                index === soru.dogruCevap || String.fromCharCode(65 + index) === soru.dogruCevap
                                                                    ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                                                            }`}
                                                        >
                                                            <span className="font-medium">{String.fromCharCode(65 + index)}:</span> {cevap}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-lg text-gray-500 dark:text-gray-400">Bu konu altında soru bulunamadı.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                        disabled={loading}
                    >
                        İptal
                    </button>
                    <button
                        onClick={createDocx}
                        className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium flex items-center"
                        disabled={loading || (indirmeMiktari === "secili" && seciliSoruSayisi() === 0)}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                İndiriliyor...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Seçili Soruları İndir
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDownloadQuestions; 