import React, { useState } from "react";
import { database } from "../firebase";
import { ref, remove } from "firebase/database";

const DeleteTopics = ({ konular, closeModal }) => {
    const [selectedTopic, setSelectedTopic] = useState("");

    const handleDeleteTopic = () => {
        if (!selectedTopic) {
            alert("Silmek için bir konu seçmelisiniz!");
            return;
        }
        const topicRef = ref(database, `konular/${selectedTopic}`);
        remove(topicRef)
            .then(() => {
                alert("Konu başarıyla silindi.");
                closeModal();
            })
            .catch((error) => {
                console.error("Konu silme hatası:", error);
                alert("Konu silinirken bir hata oluştu!");
            });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Konu Sil</h3>
                <div className="mb-4">
                    <label htmlFor="topic" className="block text-gray-700 mb-2">Konu Seçin</label>
                    <select 
                        id="topic"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Konu Seçin</option>
                        {konular.map((konu) => (
                            <option key={konu.id} value={konu.id}>
                                {konu.baslik || "Başlık Yok"}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleDeleteTopic}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mr-2"
                    >
                        Sil
                    </button>
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteTopics;