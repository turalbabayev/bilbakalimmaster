import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from "firebase/firestore";
import { toast } from 'react-toastify';

const BulkDeleteQuestions = ({ isOpen, onClose, konuId, altKonuId, altDalId }) => {
    const [loading, setLoading] = useState(false);
    const [sorular, setSorular] = useState([]);
    const [selectedSorular, setSelectedSorular] = useState({});
    const [hepsiSecili, setHepsiSecili] = useState(false);

    useEffect(() => {
        const fetchSorular = async () => {
            setLoading(true);
            try {
                let soruRef;
                if (altDalId) {
                    soruRef = collection(db, 'konular', konuId, 'altKonular', altKonuId, 'altDallar', altDalId, 'sorular');
                } else {
                    soruRef = collection(db, 'konular', konuId, 'altKonular', altKonuId, 'sorular');
                }

                const q = query(soruRef, orderBy('soruNumarasi', 'asc'));
                const querySnapshot = await getDocs(q);
                
                const soruListesi = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setSorular(soruListesi);
            } catch (error) {
                console.error('Sorular yüklenirken hata oluştu:', error);
                toast.error('Sorular yüklenirken bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };

        if (konuId && altKonuId) {
            fetchSorular();
        }
    }, [konuId, altKonuId, altDalId]);

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

    const handleBulkDelete = async () => {
        const seciliIDs = Object.entries(selectedSorular)
            .filter(([_, value]) => value)
            .map(([key]) => key);
            
        if (seciliIDs.length === 0) {
            toast.warning("Lütfen silinecek soruları seçin.");
            return;
        }
        
        if (!window.confirm(`${seciliIDs.length} adet soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
            return;
        }
        
        setLoading(true);
        try {
            // Alt dal ID'si yoksa, doğrudan alt konu altındaki sorulara bakalım
            const soruBasePath = altDalId 
                ? ["konular", konuId, "altkonular", altKonuId, "altdallar", altDalId, "sorular"]
                : ["konular", konuId, "altkonular", altKonuId, "sorular"];
                
            // Her bir soruyu sırayla sil
            for (const soruId of seciliIDs) {
                const soruRef = doc(db, ...soruBasePath, soruId);
                await deleteDoc(soruRef);
            }

            // Kalan soruların numaralarını güncelle
            const soruRef = collection(db, ...soruBasePath);
            const q = query(soruRef, orderBy("soruNumarasi", "asc"));
            const querySnapshot = await getDocs(q);
            
            let yeniNumara = 1;
            const updatePromises = [];
            
            querySnapshot.forEach((doc) => {
                if (!seciliIDs.includes(doc.id)) { // Sadece silinmemiş soruları güncelle
                    const soruRef = doc.ref;
                    updatePromises.push(updateDoc(soruRef, {
                        soruNumarasi: yeniNumara
                    }));
                    yeniNumara++;
                }
            });

            // Tüm güncelleme işlemlerini bekle
            await Promise.all(updatePromises);
            
            toast.success(`${seciliIDs.length} adet soru başarıyla silindi ve sıralama güncellendi.`);
            onClose(true); // true ile başarılı işlemi bildir
        } catch (error) {
            console.error("Sorular silinirken hata oluştu:", error);
            toast.error("Sorular silinirken bir hata oluştu!");
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
                        Toplu Soru Silme
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
                            <div className="mb-6 flex justify-between items-center">
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        id="selectAll"
                                        checked={hepsiSecili}
                                        onChange={handleHepsiToggle}
                                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <label htmlFor="selectAll" className="ml-2 text-base font-medium text-gray-900 dark:text-gray-300">
                                        Tüm Soruları Seç ({sorular.length})
                                    </label>
                                </div>
                                <div className="text-base font-medium text-gray-900 dark:text-gray-300">
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
                        className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                        disabled={loading}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all duration-200 font-medium flex items-center"
                        disabled={loading || seciliSoruSayisi() === 0}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Siliniyor...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Seçili Soruları Sil ({seciliSoruSayisi()})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDeleteQuestions; 