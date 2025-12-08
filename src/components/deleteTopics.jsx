import React, { useState } from "react";
import { db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import statsService from "../services/statsService";

const DeleteTopics = ({ konular, closeModal }) => {
    const [selectedTopic, setSelectedTopic] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDeleteTopic = async () => {
        if (!selectedTopic) {
            toast.error("Silmek için bir konu seçmelisiniz!");
            return;
        }

        if (!window.confirm("Bu konuyu silmek istediğinizden emin misiniz?")) {
            return;
        }

        setLoading(true);
        try {
            const docRef = doc(db, "konular", selectedTopic);
            await deleteDoc(docRef);
            
            // Genel istatistikleri güncelle (konu sayısını azalt)
            try {
                await statsService.decrementKonuCount(1);
            } catch (statsError) {
                console.error("Genel istatistikler güncellenirken hata:", statsError);
            }
            
            toast.success("Konu başarıyla silindi.");
            closeModal();
        } catch (error) {
            console.error("Konu silme hatası:", error);
            toast.error("Konu silinirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Konu Sil</h3>
                <div className="mb-4">
                    <label htmlFor="topic" className="block text-gray-700 dark:text-gray-300 mb-2">
                        Konu Seçin
                    </label>
                    <select 
                        id="topic"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={loading}
                    >
                        <option value="">Konu Seçin</option>
                        {konular.map((konu) => (
                            <option key={konu.id} value={konu.id}>
                                {konu.baslik || "Başlık Yok"}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={handleDeleteTopic}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Siliniyor..." : "Sil"}
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

export default DeleteTopics;