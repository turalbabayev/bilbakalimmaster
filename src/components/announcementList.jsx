import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import AddAnnouncement from "./addAnnouncement";
import { toast } from "react-hot-toast";

const AnnouncementList = () => {
    const [duyurular, setDuyurular] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedDuyuru, setSelectedDuyuru] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Firestore koleksiyonuna referans oluştur
        const duyurularRef = collection(db, "duyurular");
        
        // Tarihe göre sıralama için query oluştur
        const q = query(duyurularRef, orderBy("tarih", "desc"));
        
        // Realtime listener ekle
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const duyuruListesi = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDuyurular(duyuruListesi);
            setIsLoading(false);
        }, (error) => {
            console.error("Duyurular dinlenirken hata:", error);
            toast.error("Duyurular yüklenirken bir hata oluştu!");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) {
            try {
                const duyuruRef = doc(db, "duyurular", id);
                await deleteDoc(duyuruRef);
                toast.success("Duyuru başarıyla silindi!");
            } catch (error) {
                console.error("Duyuru silinirken bir hata oluştu:", error);
                toast.error("Duyuru silinirken bir hata oluştu!");
            }
        }
    };

    const handleToggleActive = async (id, currentActive) => {
        try {
            const duyuruRef = doc(db, "duyurular", id);
            await updateDoc(duyuruRef, { aktif: !currentActive });
            toast.success(`Duyuru durumu ${!currentActive ? "aktif" : "pasif"} olarak güncellendi.`);
        } catch (error) {
            console.error("Duyuru durumu güncellenirken bir hata oluştu:", error);
            toast.error("Duyuru durumu güncellenirken bir hata oluştu!");
        }
    };

    const formatDate = (dateString) => {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('tr-TR', options);
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Duyurular</h1>
                <button
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                    onClick={() => setIsModalOpen(true)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Yeni Duyuru Ekle
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : duyurular.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {duyurular.map((duyuru) => (
                        <div 
                            key={duyuru.id} 
                            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl border ${duyuru.aktif ? 'border-green-500' : 'border-red-500'}`}
                        >
                            {duyuru.resim ? (
                                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                                    <img 
                                        src={`data:${duyuru.resimTuru || 'image/png'};base64,${duyuru.resim}`}
                                        alt={duyuru.baslik} 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white px-2 py-1 rounded-lg text-sm">
                                        {duyuru.tip}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center relative">
                                    <p className="text-gray-500 dark:text-gray-400">Resim yok</p>
                                    <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white px-2 py-1 rounded-lg text-sm">
                                        {duyuru.tip}
                                    </div>
                                </div>
                            )}
                            
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                                        {duyuru.baslik}
                                    </h2>
                                    <span className={`text-sm px-2 py-1 rounded-full ${duyuru.aktif ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                        {duyuru.aktif ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                                
                                {/* Duyuru tipi: Duyuru */}
                                {duyuru.tip === "Duyuru" && (
                                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                                        {duyuru.aciklama}
                                    </p>
                                )}
                                
                                {/* Duyuru tipi: Etkinlik */}
                                {duyuru.tip === "Etkinlik" && (
                                    <>
                                        <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                            <span className="font-semibold">Kısa Açıklama:</span> {duyuru.kisaAciklama}
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                            <span className="font-semibold">Uzun Açıklama:</span> {duyuru.uzunAciklama}
                                        </p>
                                        <p className="text-emerald-600 dark:text-emerald-400 mb-3 font-semibold">
                                            Ücret: {duyuru.ucret} TL
                                        </p>
                                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mb-3">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ödeme Sonrası İçerik:</p>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-1">
                                                {duyuru.odemeSonrasiIcerik || "Belirtilmemiş"}
                                            </p>
                                        </div>
                                    </>
                                )}
                                
                                {/* Duyuru tipi: Bilgilendirme */}
                                {duyuru.tip === "Bilgilendirme" && (
                                    <>
                                        <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-3">
                                            {duyuru.kisaAciklama}
                                        </p>
                                        <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded-lg mb-3">
                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                                <span className="font-semibold">Hedef Sayfa:</span> {duyuru.target}
                                            </p>
                                        </div>
                                    </>
                                )}
                                
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    {formatDate(duyuru.tarih)}
                                </div>
                                
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => handleToggleActive(duyuru.id, duyuru.aktif)}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                            duyuru.aktif 
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800' 
                                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                                        }`}
                                    >
                                        {duyuru.aktif ? 'Pasif Yap' : 'Aktif Yap'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(duyuru.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400">Henüz duyuru bulunmuyor.</p>
                </div>
            )}

            {isModalOpen && (
                <AddAnnouncement 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default AnnouncementList; 