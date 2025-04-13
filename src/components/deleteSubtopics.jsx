import React, { useState } from "react";
import { database } from "../firebase";
import { ref, remove } from "firebase/database";

const DeleteSubtopics = ({ konular, closeModal }) => {
    const [selectedTopic, setSelectedTopic] = useState("");
    const [selectedSubtopic, setSelectedSubtopic] = useState("");

    const handleDeleteSubtopic = () => {
        if (!selectedTopic) {
            alert("Bir konu seçmelisiniz!");
            return;
        }
        if (!selectedSubtopic) {
            alert("Bir alt konu seçmelisiniz!");
            return;
        }

        const subtopicRef = ref(database, `konular/${selectedTopic}/altkonular/${selectedSubtopic}`);
        remove(subtopicRef)
            .then(() => {
                alert("Alt konu başarıyla silindi.");
                setSelectedTopic("");
                setSelectedSubtopic("");
                closeModal();
            })
            .catch((error) => {
                console.error("Alt konu silinirken hata oluştu:", error);
                alert("Alt konu silinemedi!");
            });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Alt Konu Sil</h3>
                <div className="mb-4">
                    <label htmlFor="topic" className="block text-gray-700 mb-2">
                        Konu Seçin
                    </label>
                    <select 
                        id="topic"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Bir konu seçin</option>
                        {konular.map((konu) => (
                            <option key={konu.id} value={konu.id}>{konu.baslik}</option>
                        ))}
                    </select>
                </div>
                {selectedTopic && (
                    <div className="mb-4">
                        <label htmlFor="subtopic" className="block text-gray-700 mb-2">
                            Alt konu seçin
                        </label>
                        <select 
                            id="subtopic"
                            value={selectedSubtopic}
                            onChange={(e) => setSelectedSubtopic(e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Bir alt konu seçin</option>
                            {konular
                                .find((konu) => konu.id === selectedTopic)
                                ?.altkonular &&
                                Object.entries(
                                    konular.find((konu) => konu.id === selectedTopic).altkonular
                                ).map(([key, altkonu]) => (
                                    <option key={key} value={key}>
                                        {altkonu.baslik}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
                <div className="flex justify-end">
                    <button
                        onClick={handleDeleteSubtopic}
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

export default DeleteSubtopics;