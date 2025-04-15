import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { toast } from 'react-hot-toast';

const CurrentInfoList = forwardRef((props, ref) => {
    const [guncelBilgiler, setGuncelBilgiler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchGuncelBilgiler = async () => {
        try {
            const q = query(collection(db, "guncelBilgiler"), orderBy("tarih", "desc"));
            const querySnapshot = await getDocs(q);
            
            const bilgiler = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tarih: doc.data().tarih?.toDate()
            }));
            
            setGuncelBilgiler(bilgiler);
        } catch (error) {
            console.error("Güncel bilgiler yüklenirken hata:", error);
            toast.error("Güncel bilgiler yüklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        fetchGuncelBilgiler
    }));

    const handleDelete = async (id) => {
        if (!window.confirm("Bu güncel bilgiyi silmek istediğinize emin misiniz?")) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "guncelBilgiler", id));
            toast.success("Güncel bilgi başarıyla silindi!");
            fetchGuncelBilgiler();
        } catch (error) {
            console.error("Güncel bilgi silinirken hata:", error);
            toast.error("Güncel bilgi silinirken bir hata oluştu!");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchGuncelBilgiler();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-16 h-16 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guncelBilgiler.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                    Henüz güncel bilgi bulunmuyor.
                </div>
            ) : (
                guncelBilgiler.map((bilgi) => (
                    <div
                        key={bilgi.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                        {bilgi.resim && (
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={bilgi.resim}
                                    alt={bilgi.baslik}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <div className="p-6">
                            <div className="flex justify-between items-start gap-4">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {bilgi.baslik}
                                </h3>
                                <button
                                    onClick={() => handleDelete(bilgi.id)}
                                    disabled={isDeleting}
                                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            <div 
                                className="mt-4 prose dark:prose-invert max-w-none line-clamp-3"
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
});

export default CurrentInfoList; 