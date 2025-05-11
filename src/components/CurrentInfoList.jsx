import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc, writeBatch, serverTimestamp, getDoc, where } from "firebase/firestore";
import { toast } from 'react-hot-toast';
import EditCurrentInfo from "./EditCurrentInfo";

const CurrentInfoList = forwardRef((props, ref) => {
    const [guncelBilgiler, setGuncelBilgiler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedBilgi, setSelectedBilgi] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [seciliTakasBilgi, setSeciliTakasBilgi] = useState(null);

    const fetchGuncelBilgiler = async () => {
        try {
            console.log("Güncel bilgiler yükleniyor...");
            const guncelBilgilerRef = collection(db, "guncelBilgiler");
            const q = query(guncelBilgilerRef, orderBy("bilgiNo", "asc"));
            const querySnapshot = await getDocs(q);
            
            const bilgiler = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tarih: doc.data().tarih?.toDate()
            }));
            
            console.log("Yüklenen güncel bilgiler:", bilgiler);
            setGuncelBilgiler(bilgiler);
        } catch (error) {
            console.error("Güncel bilgiler yüklenirken hata:", error);
            toast.error("Güncel bilgiler yüklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuncelBilgiler();
    }, []);

    useImperativeHandle(ref, () => ({
        fetchGuncelBilgiler
    }));

    const yenidenNumaralandir = async () => {
        try {
            const guncelBilgilerRef = collection(db, "guncelBilgiler");
            const q = query(guncelBilgilerRef, orderBy("bilgiNo", "asc"));
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            let yeniBilgiNo = 1;

            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    bilgiNo: yeniBilgiNo,
                    updatedAt: serverTimestamp()
                });
                yeniBilgiNo++;
            });

            await batch.commit();
            await fetchGuncelBilgiler();
        } catch (error) {
            console.error("Bilgiler yeniden numaralandırılırken hata:", error);
            toast.error("Bilgiler yeniden numaralandırılırken bir hata oluştu!");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bu güncel bilgiyi silmek istediğinize emin misiniz?")) {
            return;
        }

        setIsDeleting(true);
        try {
            const bilgiRef = doc(db, "guncelBilgiler", id);
            await deleteDoc(bilgiRef);
            await yenidenNumaralandir();
            toast.success("Güncel bilgi başarıyla silindi!");
        } catch (error) {
            console.error("Güncel bilgi silinirken hata:", error);
            toast.error("Güncel bilgi silinirken bir hata oluştu!");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = async (bilgi) => {
        try {
            const bilgiRef = doc(db, "guncelBilgiler", bilgi.id);
            const bilgiDoc = await getDoc(bilgiRef);
            
            if (bilgiDoc.exists()) {
                const guncelBilgi = {
                    id: bilgiDoc.id,
                    ...bilgiDoc.data(),
                    tarih: bilgiDoc.data().tarih?.toDate()
                };
                setSelectedBilgi(guncelBilgi);
                setIsEditModalOpen(true);
            }
        } catch (error) {
            console.error("Bilgi getirilirken hata:", error);
            toast.error("Bilgi getirilirken bir hata oluştu!");
        }
    };

    const handleTakasClick = (bilgi) => {
        if (seciliTakasBilgi === null) {
            setSeciliTakasBilgi(bilgi);
            toast.success("Şimdi takas etmek istediğiniz hedef bilgiyi seçin");
        } else {
            handleTakas(seciliTakasBilgi, bilgi);
            setSeciliTakasBilgi(null);
        }
    };

    const handleTakas = async (bilgi1, bilgi2) => {
        try {
            const batch = writeBatch(db);
            
            const bilgi1Ref = doc(db, "guncelBilgiler", bilgi1.id);
            const bilgi2Ref = doc(db, "guncelBilgiler", bilgi2.id);
            
            batch.update(bilgi1Ref, {
                bilgiNo: bilgi2.bilgiNo,
                updatedAt: serverTimestamp()
            });
            
            batch.update(bilgi2Ref, {
                bilgiNo: bilgi1.bilgiNo,
                updatedAt: serverTimestamp()
            });
            
            await batch.commit();
            await yenidenNumaralandir();
            toast.success("Bilgiler başarıyla takas edildi!");
        } catch (error) {
            console.error("Bilgiler takas edilirken hata:", error);
            toast.error("Bilgiler takas edilirken bir hata oluştu!");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guncelBilgiler.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        Henüz güncel bilgi bulunmuyor.
                    </div>
                ) : (
                    guncelBilgiler.map((bilgi) => (
                        <div
                            key={bilgi.id}
                            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 ${
                                seciliTakasBilgi?.id === bilgi.id ? 'ring-2 ring-blue-500' : ''
                            }`}
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
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                                            Bilgi No: {bilgi.bilgiNo}
                                        </span>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            {bilgi.baslik}
                                        </h3>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(bilgi)}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            disabled={isDeleting}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(bilgi.id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                            disabled={isDeleting}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleTakasClick(bilgi)}
                                            className={`text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 ${
                                                seciliTakasBilgi?.id === bilgi.id ? 'ring-2 ring-yellow-500 rounded' : ''
                                            }`}
                                            disabled={isDeleting}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM8 11a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM8 15a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div 
                                    className="prose dark:prose-invert max-w-none mb-4"
                                    dangerouslySetInnerHTML={{ __html: bilgi.icerik }}
                                />
                                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                    <div>
                                        {bilgi.tarih ? bilgi.tarih.toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}
                                    </div>
                                    <div className="flex space-x-4">
                                        <div className="flex items-center text-green-600 dark:text-green-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                            </svg>
                                            {bilgi.liked || 0}
                                        </div>
                                        <div className="flex items-center text-red-600 dark:text-red-400">
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
                        </div>
                    ))
                )}
            </div>

            <EditCurrentInfo
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedBilgi(null);
                }}
                bilgi={selectedBilgi}
                onSuccess={fetchGuncelBilgiler}
            />
        </>
    );
});

export default CurrentInfoList; 