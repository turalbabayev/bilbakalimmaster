import React, { useState } from "react";
import { database } from "../firebase";
import { ref, push } from "firebase/database";

const AddTopics = ({ closeModal }) => {
    const [topicTitle, setTopicTitle] = useState("");

    const handleAddTopic = () => {
        if (!topicTitle.trim()) {
            alert("Konu başlığı boş olamaz!");
            return;
        }
        const topicsRef = ref(database, "konular");
        const newTopic = {
            baslik: topicTitle,
            altkonular: {},
        };
        push(topicsRef, newTopic)
            .then(() => {
                alert("Konu başarıyla eklendi.");
                setTopicTitle("");
                closeModal();
            })
            .catch((error) => {
                console.error("Konu eklenirken bir hata oluştu: ", error);
                alert("Konu eklenirken bir hata oluştu!");
            });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Konu Ekle</h3>
                <div className="mb-4">
                    <label htmlFor="topic" className="block text-gray-700 mb-2">Konu Başlığı</label>
                    <input 
                        type="text"
                        id="topic"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        placeholder="Konu başlığı giriniz"
                        className="w-full p-2 border rounded" 
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleAddTopic}
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

export default AddTopics;