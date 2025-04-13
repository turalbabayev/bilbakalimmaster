import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-toastify';

const BulkDeleteQuestions = ({ isOpen, onClose, konuId, altKonuId }) => {
    const [sorular, setSorular] = useState({});
    const [selectedSorular, setSelectedSorular] = useState({});
    const [yukleniyor, setYukleniyor] = useState(false);
    const [siliniyor, setSiliniyor] = useState(false);

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

    const handleTopluSil = async () => {
        const secilenSoruIds = Object.entries(selectedSorular)
            .filter(([_, selected]) => selected)
            .map(([id]) => id);

        if (secilenSoruIds.length === 0) {
            toast.warning("Lütfen silinecek soruları seçin!");
            return;
        }

        if (!window.confirm(`${secilenSoruIds.length} soruyu silmek istediğinize emin misiniz?`)) {
            return;
        }

        setSiliniyor(true);
        try {
            // Seçili soruları sil
            for (const soruId of secilenSoruIds) {
                const soruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", soruId);
                await deleteDoc(soruRef);
            }

            // Kalan soruların numaralarını güncelle
            const kalanSorular = Object.values(sorular)
                .filter(soru => !secilenSoruIds.includes(soru.id))
                .sort((a, b) => a.soruNumarasi - b.soruNumarasi);

            // Soru numaralarını yeniden düzenle
            const updatePromises = kalanSorular.map((soru, index) => {
                const soruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", soru.id);
                return updateDoc(soruRef, {
                    soruNumarasi: index + 1
                });
            });

            await Promise.all(updatePromises);

            toast.success(`${secilenSoruIds.length} soru başarıyla silindi!`);
            onClose(true);
        } catch (error) {
            console.error("Sorular silinirken hata:", error);
            toast.error("Sorular silinirken bir hata oluştu!");
        } finally {
            setSiliniyor(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Toplu Soru Silme</h2>
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
                        onClick={() => onClose(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        disabled={siliniyor}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleTopluSil}
                        disabled={Object.values(selectedSorular).filter(Boolean).length === 0 || siliniyor}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {siliniyor ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Siliniyor...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>Seçili Soruları Sil</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDeleteQuestions; 