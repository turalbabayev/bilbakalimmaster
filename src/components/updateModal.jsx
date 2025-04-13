import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

function UpdateModal({ isOpen, closeModal, updatePath, itemType }) {
    const [title, setTitle] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const docRef = doc(db, updatePath);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setTitle(docSnap.data().baslik || "");
                }
            } catch (error) {
                console.error("Veri çekilirken hata oluştu:", error);
                toast.error("Veri yüklenirken bir hata oluştu");
            }
        };

        if (isOpen && updatePath) {
            fetchData();
        }
    }, [isOpen, updatePath]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim()) {
            toast.error("Başlık boş olamaz");
            return;
        }

        try {
            const docRef = doc(db, updatePath);
            await updateDoc(docRef, {
                baslik: title
            });
            
            toast.success(`${itemType} başarıyla güncellendi`);
            closeModal();
        } catch (error) {
            console.error("Güncelleme sırasında hata oluştu:", error);
            toast.error("Güncelleme sırasında bir hata oluştu");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{itemType} Güncelle</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                            Başlık
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Yeni başlık girin"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                        >
                            Güncelle
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UpdateModal;