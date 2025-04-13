import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const UpdateModal = ({ isOpen, closeModal, updatePath, itemType }) => {
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (updatePath) {
                try {
                    const docRef = doc(db, updatePath);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        setTitle(docSnap.data().baslik || "");
                    }
                } catch (error) {
                    console.error("Veri çekme hatası:", error);
                    toast.error("Veri yüklenirken bir hata oluştu!");
                }
            }
        };

        fetchData();
    }, [updatePath]);

    const handleUpdate = async () => {
        if (!title.trim()) {
            toast.error("Başlık boş olamaz!");
            return;
        }

        setLoading(true);
        try {
            const docRef = doc(db, updatePath);
            await updateDoc(docRef, {
                baslik: title,
                updatedAt: new Date().toISOString()
            });
            
            toast.success(`${itemType} başarıyla güncellendi.`);
            closeModal();
        } catch (error) {
            console.error(`${itemType} güncelleme hatası:`, error);
            toast.error(`${itemType} güncellenirken bir hata oluştu!`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{itemType} Güncelle</h3>
                <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Başlık
                    </label>
                    <input 
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={loading}
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Güncelleniyor..." : "Güncelle"}
                    </button>
                    <button
                        onClick={closeModal}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateModal;