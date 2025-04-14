import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";

const AddSubtopics = ({ konular, closeModal }) => {
    const [selectedTopic, setSelectedTopic] = useState("");
    const [altKonuBaslik, setAltKonuBaslik] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAddSubTopic = async () => {
        if (!selectedTopic) {
            toast.error("Bir konu seçmelisiniz!");
            return;
        }
        if (!altKonuBaslik.trim()) {
            toast.error("Alt konu başlığı boş olamaz!");
            return;
        }

        setIsLoading(true);
        try {
            // Firestore'da alt konu koleksiyonuna referans oluştur
            const altKonularRef = collection(db, `konular/${selectedTopic}/altkonular`);
            
            // Yeni alt konu verisi
            const yeniAltKonu = {
                baslik: altKonuBaslik
            };

            // Firestore'a kaydet
            const docRef = await addDoc(altKonularRef, yeniAltKonu);
            
            // Sorular alt koleksiyonunu oluştur
            const sorularRef = collection(db, `konular/${selectedTopic}/altkonular/${docRef.id}/sorular`);
            
            toast.success("Alt konu başarıyla eklendi!");
            setAltKonuBaslik("");
            closeModal();
        } catch (error) {
            console.error("Alt konu eklenirken hata:", error);
            toast.error("Alt konu eklenirken bir hata oluştu!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Alt Konu Ekle</h3>
                <div className="mb-4">
                    <label htmlFor="topic" className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                        Konu Seçin
                    </label>
                    <select 
                        id="topic"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-600"
                        disabled={isLoading}
                    >
                        <option value="">Bir konu seçin</option>
                        {konular.map((konu) => (
                            <option key={konu.id} value={konu.id}>{konu.baslik}</option>
                        ))}
                    </select>
                </div>
                <div className="mb-6">
                    <label htmlFor="subtopic" className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                        Alt Konu Başlığı
                    </label>
                    <input 
                        type="text"
                        id="subtopic"
                        value={altKonuBaslik}
                        onChange={(e) => setAltKonuBaslik(e.target.value)}
                        placeholder="Alt konu başlığı giriniz"
                        className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-600"
                        disabled={isLoading}
                    />
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        disabled={isLoading}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleAddSubTopic}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Ekleniyor...
                            </>
                        ) : (
                            'Ekle'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSubtopics;