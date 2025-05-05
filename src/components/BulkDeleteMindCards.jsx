import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const BulkDeleteMindCards = ({ isOpen, onClose, konuId }) => {
    const [kartlar, setKartlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [siliniyor, setSiliniyor] = useState(false);
    const [seciliKartlar, setSeciliKartlar] = useState([]);

    useEffect(() => {
        const kartlariGetir = async () => {
            try {
                setYukleniyor(true);
                const kartlarRef = collection(db, `miniCards-konular/${konuId}/cards`);
                const snapshot = await getDocs(kartlarRef);
                const kartlarData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Kartları sırala: Önce kartNo'su olanlar, sonra olmayanlar
                const siraliKartlar = kartlarData.sort((a, b) => {
                    if (a.kartNo && b.kartNo) {
                        return a.kartNo - b.kartNo;
                    }
                    if (a.kartNo) return -1;
                    if (b.kartNo) return 1;
                    if (a.createdAt && b.createdAt) {
                        return a.createdAt.seconds - b.createdAt.seconds;
                    }
                    return 0;
                });

                setKartlar(siraliKartlar);
            } catch (error) {
                console.error("Kartlar getirilirken hata:", error);
                toast.error("Kartlar yüklenirken bir hata oluştu!");
            } finally {
                setYukleniyor(false);
            }
        };

        if (isOpen) {
            kartlariGetir();
            setSeciliKartlar([]); // Modal her açıldığında seçili kartları sıfırla
        }
    }, [konuId, isOpen]);

    const handleKartSecim = (kartId) => {
        setSeciliKartlar(prev => {
            if (prev.includes(kartId)) {
                return prev.filter(id => id !== kartId);
            } else {
                return [...prev, kartId];
            }
        });
    };

    const handleTopluSecim = () => {
        if (seciliKartlar.length === kartlar.length) {
            setSeciliKartlar([]);
        } else {
            setSeciliKartlar(kartlar.map(kart => kart.id));
        }
    };

    const kartlariSil = async () => {
        if (seciliKartlar.length === 0) {
            toast.error("Lütfen silinecek kartları seçin!");
            return;
        }

        if (!window.confirm(`${seciliKartlar.length} adet kartı silmek istediğinizden emin misiniz?`)) {
            return;
        }

        try {
            setSiliniyor(true);
            let basariliSilinen = 0;
            let hataliSilinen = 0;

            for (const kartId of seciliKartlar) {
                try {
                    const kartRef = doc(db, `miniCards-konular/${konuId}/cards`, kartId);
                    await deleteDoc(kartRef);
                    basariliSilinen++;
                } catch (error) {
                    console.error(`Kart silinirken hata (ID: ${kartId}):`, error);
                    hataliSilinen++;
                }
            }

            if (basariliSilinen > 0) {
                toast.success(`${basariliSilinen} kart başarıyla silindi!`);
            }
            if (hataliSilinen > 0) {
                toast.error(`${hataliSilinen} kart silinirken hata oluştu.`);
            }

            onClose(); // Başarılı veya başarısız, işlem bitince modalı kapat
        } catch (error) {
            console.error("Kartlar silinirken hata:", error);
            toast.error("Kartlar silinirken bir hata oluştu!");
        } finally {
            setSiliniyor(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Akıl Kartlarını Sil
                    </h2>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    {yukleniyor ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <>
                            {kartlar.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Toplam {kartlar.length} kart bulundu. Silmek istediğiniz kartları seçin.
                                        </p>
                                        <button
                                            onClick={handleTopluSecim}
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            {seciliKartlar.length === kartlar.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                        </button>
                                    </div>
                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {kartlar.map((kart) => (
                                            <div 
                                                key={kart.id} 
                                                className={`bg-gray-50 dark:bg-gray-800 p-4 rounded-lg cursor-pointer transition-colors ${
                                                    seciliKartlar.includes(kart.id) 
                                                        ? 'ring-2 ring-red-500 dark:ring-red-400' 
                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                                onClick={() => handleKartSecim(kart.id)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="inline-flex items-center justify-center bg-blue-600 text-white font-semibold rounded-full w-6 h-6 text-sm">
                                                        {kart.kartNo || '-'}
                                                    </span>
                                                    <input 
                                                        type="checkbox"
                                                        checked={seciliKartlar.includes(kart.id)}
                                                        onChange={() => handleKartSecim(kart.id)}
                                                        className="h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                        Alt Konu: {kart.altKonu}
                                                    </p>
                                                    <div dangerouslySetInnerHTML={{ __html: kart.content }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Henüz kart bulunmamaktadır.
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {seciliKartlar.length} kart seçildi
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        {kartlar.length > 0 && !yukleniyor && (
                            <button
                                onClick={kartlariSil}
                                disabled={siliniyor || seciliKartlar.length === 0}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {siliniyor ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                        Siliniyor...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Seçilenleri Sil
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkDeleteMindCards; 