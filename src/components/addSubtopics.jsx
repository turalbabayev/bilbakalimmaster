import React, { useState } from "react";
import { database } from "../firebase";
import { ref, push } from "firebase/database";

const AddSubtopics = ({ konular, closeModal }) => {
    const [selectedTopic, setSelectedTopic] = useState("");
    const [altKonuBaslik, setAltKonuBaslik] = useState("");

    const handleAddSubTopic = () => {
        if (!selectedTopic) {
            alert("Bir konu seçmelisiniz!");
            return;
        }
        if (!altKonuBaslik.trim()) {
            alert("Alt konu başlığı boş olamaz!");
            return;
        }
        try {
            const altKonularRef = ref(database, `konular/${selectedTopic}/altkonular`);
            const newSubTopic = { baslik: altKonuBaslik };

            push(altKonularRef, newSubTopic)
                .then(() => {
                    alert("Alt konu başarıyla eklendi.");
                    setAltKonuBaslik("");
                    closeModal();
                })
                .catch((error) => {
                    console.error("Alt konu eklenirken hata oluştu: ", error);
                    alert("Alt konu eklenemedi.");
                });
        } catch (error) {
            console.error("Referans yolu oluşturulamadı:", error);
            alert("Bir hata oluştu! Lütfen tekrar deneyin.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Alt Konu Ekle</h3>
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
                <div className="mb-4">
                    <label htmlFor="subtopic" className="block text-gray-700 mb-2">
                        Alt Konu Başlığı
                    </label>
                    <input 
                        type="text"
                        id="subtopic"
                        value={altKonuBaslik}
                        onChange={(e) => setAltKonuBaslik(e.target.value)}
                        placeholder="Alt konu başlığı giriniz"
                        className="w-full p-2 border rounded" 
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleAddSubTopic}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                    >
                        Ekle
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

export default AddSubtopics;