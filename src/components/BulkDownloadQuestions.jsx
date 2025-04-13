import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { toast } from 'react-toastify';

const BulkDownloadQuestions = ({ isOpen, onClose, konuId, altKonuId }) => {
    const [sorular, setSorular] = useState({});
    const [selectedSorular, setSelectedSorular] = useState({});
    const [yukleniyor, setYukleniyor] = useState(false);
    const [indiriliyor, setIndiriliyor] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSorular();
        }
    }, [isOpen, konuId, altKonuId]);

    const fetchSorular = async () => {
        setYukleniyor(true);
        try {
            const sorularRef = collection(db, "konular", konuId, "altkonular", altKonuId, "sorular");
            const q = query(sorularRef, orderBy("soruNumarasi", "asc"));
            const querySnapshot = await getDocs(q);
            
            const sorularData = {};
            querySnapshot.forEach((doc) => {
                sorularData[doc.id] = { id: doc.id, ...doc.data() };
            });
            
            setSorular(sorularData);
        } catch (error) {
            console.error("Sorular yüklenirken hata:", error);
            toast.error("Sorular yüklenirken bir hata oluştu!");
        } finally {
            setYukleniyor(false);
        }
    };

    const handleSoruToggle = (soruId) => {
        setSelectedSorular(prev => ({
            ...prev,
            [soruId]: !prev[soruId]
        }));
    };

    const handleTopluIndir = async () => {
        const secilenSoruIds = Object.entries(selectedSorular)
            .filter(([_, selected]) => selected)
            .map(([id]) => id);

        if (secilenSoruIds.length === 0) {
            toast.warning("Lütfen indirilecek soruları seçin!");
            return;
        }

        setIndiriliyor(true);
        try {
            // Seçili soruları al ve sırala
            const secilenSorular = secilenSoruIds
                .map(id => sorular[id])
                .sort((a, b) => a.soruNumarasi - b.soruNumarasi);

            // Word dokümanı oluştur
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: "Seçili Sorular",
                            heading: HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        ...secilenSorular.flatMap(soru => [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Soru ${soru.soruNumarasi}`,
                                        bold: true,
                                        size: 28
                                    })
                                ],
                                spacing: { before: 200, after: 100 }
                            }),
                            new Paragraph({
                                text: soru.soruMetni,
                                spacing: { after: 200 }
                            }),
                            ...soru.cevaplar.map((cevap, index) => 
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${String.fromCharCode(65 + index)}) ${cevap}`,
                                            bold: String.fromCharCode(65 + index) === soru.dogruCevap
                                        })
                                    ],
                                    spacing: { after: 100 }
                                })
                            ),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Doğru Cevap: ${soru.dogruCevap}`,
                                        bold: true,
                                        color: "008000"
                                    })
                                ],
                                spacing: { before: 100, after: 200 }
                            })
                        ])
                    ]
                }]
            });

            // Dokümanı indir
            const buffer = await Packer.toBuffer(doc);
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            saveAs(blob, 'secili_sorular.docx');

            toast.success(`${secilenSorular.length} soru başarıyla indirildi!`);
            onClose();
        } catch (error) {
            console.error("Sorular indirilirken hata:", error);
            toast.error("Sorular indirilirken bir hata oluştu!");
        } finally {
            setIndiriliyor(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Toplu Soru İndirme</h2>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {yukleniyor ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : Object.keys(sorular).length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            Bu alt konuda soru bulunmamaktadır.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(sorular).map(([soruId, soru]) => (
                                <div key={soruId} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-start">
                                    <input 
                                        type="checkbox" 
                                        id={`soru-${soruId}`}
                                        checked={!!selectedSorular[soruId]}
                                        onChange={() => handleSoruToggle(soruId)}
                                        className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <label htmlFor={`soru-${soruId}`} className="ml-3 flex-1 cursor-pointer">
                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                            <span className="font-medium">Soru {soru.soruNumarasi}:</span> {soru.soruMetni}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Doğru Cevap: {soru.dogruCevap}
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end space-x-4">
                    <button
                        onClick={() => onClose()}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        disabled={indiriliyor}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleTopluIndir}
                        disabled={Object.values(selectedSorular).filter(Boolean).length === 0 || indiriliyor}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {indiriliyor ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>İndiriliyor...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span>Seçili Soruları İndir</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDownloadQuestions; 