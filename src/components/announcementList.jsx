import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import AddAnnouncement from "./addAnnouncement";

const AnnouncementList = () => {
    const [duyurular, setDuyurular] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedDuyuru, setSelectedDuyuru] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "duyurular"), orderBy("tarih", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const yeniDuyurular = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDuyurular(yeniDuyurular);
            setLoading(false);
        }, (error) => {
            console.error("Hata:", error);
            toast.error("Duyurular yüklenirken bir hata oluştu!");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Bu duyuruyu silmek istediğinizden emin misiniz?")) {
            return;
        }

        try {
            await deleteDoc(doc(db, "duyurular", id));
            toast.success("Duyuru başarıyla silindi!");
        } catch (error) {
            console.error("Hata:", error);
            toast.error("Duyuru silinirken bir hata oluştu!");
        }
    };

    const handleToggleActive = async (id, currentActive) => {
        try {
            await updateDoc(doc(db, "duyurular", id), {
                aktif: !currentActive
            });
            toast.success(`Duyuru durumu ${!currentActive ? "aktif" : "pasif"} olarak güncellendi!`);
        } catch (error) {
            console.error("Hata:", error);
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

            {loading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : duyurular.length > 0 ? (
                <div className="space-y-4">
                    {duyurular.map((duyuru) => (
                        <div
                            key={duyuru.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    {duyuru.baslik}
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleToggleActive(duyuru.id, duyuru.aktif)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                                            duyuru.aktif
                                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        {duyuru.aktif ? "Aktif" : "Pasif"}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(duyuru.id)}
                                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">{duyuru.icerik}</p>
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                                {formatDate(duyuru.tarih.toDate())}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400">Henüz duyuru bulunmuyor.</p>
                </div>
            )}

            <AddAnnouncement
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default AnnouncementList; 