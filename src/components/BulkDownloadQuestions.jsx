import React, { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { toast } from 'react-toastify';

const BulkDownloadQuestions = ({ isOpen, onClose, konuId, altKonuId, altDalId }) => {
    const [loading, setLoading] = useState(false);
    const [sorular, setSorular] = useState([]);
    const [selectedSorular, setSelectedSorular] = useState({});
    const [hepsiSecili, setHepsiSecili] = useState(false);
    const [indirmeTipi, setIndirmeTipi] = useState("tum");
    const [indirmeMiktari, setIndirmeMiktari] = useState("secili");

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
                
                setSorular(soruData);
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
                            size: 32
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
                                    text: `Soru ${soru.soruNumarasi || ""}`,
                                    bold: true,
                                    size: 28
                                })
                            ],
                            spacing: { before: 400, after: 200 }
                        })
                    );

                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: soru.soruMetni ? soru.soruMetni.replace(/<[^>]*>/g, '') : "",
                                })
                            ],
                            spacing: { after: 200 }
                        })
                    );

                    // Şıklar
                    if (soru.cevaplar && Array.isArray(soru.cevaplar)) {
                        for (let i = 0; i < soru.cevaplar.length; i++) {
                            children.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${String.fromCharCode(65 + i)}) ${soru.cevaplar[i] || ""}`,
                                            bold: String.fromCharCode(65 + i) === soru.dogruCevap
                                        })
                                    ],
                                    spacing: { after: 100 }
                                })
                            );
                        }
                    }

                    // Doğru cevap ve açıklama
                    if (indirmeTipi === "tum") {
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Doğru Cevap: ${soru.dogruCevap || ""}`,
                                        bold: true,
                                        color: "2b5797"
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
                                            bold: true
                                        }),
                                        new TextRun({
                                            text: soru.aciklama.replace(/<[^>]*>/g, '')
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
                }]
            });

            console.log("Doküman oluşturuldu, buffer'a dönüştürülüyor...");

            try {
                // Dokümanı buffer'a dönüştür
                const buffer = await Packer.toBuffer(doc);
                console.log("Buffer oluşturuldu, boyut:", buffer.length);

                // Blob oluştur
                const blob = new Blob([buffer], { 
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
                });
                console.log("Blob oluşturuldu, boyut:", blob.size);

                // Dosya adını oluştur
                const fileName = `sorular_${new Date().toISOString().split('T')[0]}.docx`;
                
                // Dosyayı kaydet
                await saveAs(blob, fileName);
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

                            <div className="space-y-4">
                                {sorular.map((soru, index) => (
                                    <div key={soru.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <div className="flex items-start space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedSorular[soru.id] || false}
                                                onChange={() => handleSoruToggle(soru.id)}
                                                className="form-checkbox text-blue-600 mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {soru.soruNumarasi || index + 1}. Soru
                                                    </span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        Doğru Cevap: {soru.dogruCevap}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-gray-700 dark:text-gray-300">
                                                    {soru.soruMetni.replace(/<[^>]*>/g, '')}
                                                </p>
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
                        disabled={loading}
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => {
                            console.log("İndir butonuna tıklandı");
                            createDocx().catch(error => {
                                console.error("İndirme işlemi başarısız:", error);
                                toast.error("İndirme işlemi başarısız oldu!");
                            });
                        }}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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