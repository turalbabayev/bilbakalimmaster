import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { toast } from 'react-hot-toast';

const CurrentInfoList = () => {
    const [guncelBilgiler, setGuncelBilgiler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchGuncelBilgiler();
    }, []);

    const fetchGuncelBilgiler = async () => {
        try {
            const q = query(collection(db, "guncelBilgiler"), orderBy("tarih", "desc"));
            const querySnapshot = await getDocs(q);
            
            const bilgiler = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tarih: doc.data().tarih?.toDate() // Firestore timestamp'i JavaScript Date'e çevir
            }));
            
            setGuncelBilgiler(bilgiler);
        } catch (error) {
            console.error("Güncel bilgiler yüklenirken hata:", error);
            toast.error("Güncel bilgiler yüklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bu güncel bilgiyi silmek istediğinize emin misiniz?")) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "guncelBilgiler", id));
            toast.success("Güncel bilgi başarıyla silindi!");
            fetchGuncelBilgiler(); // Listeyi yenile
        } catch (error) {
            console.error("Güncel bilgi silinirken hata:", error);
            toast.error("Güncel bilgi silinirken bir hata oluştu!");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-16 h-16 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {guncelBilgiler.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Henüz güncel bilgi bulunmuyor.
                </div>
            ) : (
                guncelBilgiler.map((bilgi) => (
                    <div
                        key={bilgi.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                        {bilgi.resim && (
                            <div className="aspect-video w-full overflow-hidden">
                                <img
                                    src={bilgi.resim}
                                    alt={bilgi.baslik}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {bilgi.baslik}
                                </h3>
                                <button
                                    onClick={() => handleDelete(bilgi.id)}
                                    disabled={isDeleting}
                                    className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
                                >
                                    {isDeleting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Siliniyor...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Sil
                                        </>
                                    )}
                                </button>
                            </div>
                            <div 
                                className="mt-4 prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: bilgi.icerik }}
                            />
                            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                {bilgi.tarih ? (
                                    <time dateTime={bilgi.tarih.toISOString()}>
                                        {bilgi.tarih.toLocaleString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </time>
                                ) : (
                                    "Tarih belirtilmemiş"
                                )}
                            </div>
                            <div className="mt-4 flex items-center gap-4 text-sm">
                                <div className="flex items-center text-green-600 dark:text-green-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                    {bilgi.liked || 0}
                                </div>
                                <div className="flex items-center text-rose-600 dark:text-rose-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                    </svg>
                                    {bilgi.unliked || 0}
                                </div>
                                <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {bilgi.report || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default CurrentInfoList; 