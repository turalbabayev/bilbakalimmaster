import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const AddTopics = ({ closeModal }) => {
    const [topicTitle, setTopicTitle] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAddTopic = async () => {
        if (!topicTitle.trim()) {
            toast.error("Konu başlığı boş olamaz!");
            return;
        }

        setLoading(true);
        try {
            const konularRef = collection(db, "konular");
            await addDoc(konularRef, {
                baslik: topicTitle,
                altkonular: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            toast.success("Konu başarıyla eklendi.");
            setTopicTitle("");
            closeModal();
        } catch (error) {
            console.error("Konu eklenirken bir hata oluştu: ", error);
            toast.error("Konu eklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Konu Ekle</h3>
                <div className="mb-4">
                    <label htmlFor="topic" className="block text-gray-700 dark:text-gray-300 mb-2">
                        Konu Başlığı
                    </label>
                    <input 
                        type="text"
                        id="topic"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        placeholder="Konu başlığı giriniz"
                        className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={loading}
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={handleAddTopic}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Ekleniyor..." : "Ekle"}
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

export default AddTopics;