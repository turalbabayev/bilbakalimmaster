import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const ImportQuestionsFromJSON = ({ konuId, altKonuId, selectedAltDal, onClose }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === "application/json") {
            setFile(selectedFile);
        } else {
            toast.error("Lütfen geçerli bir JSON dosyası seçin!");
            setFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Lütfen bir JSON dosyası seçin!");
            return;
        }

        setLoading(true);
        try {
            const fileContent = await file.text();
            const questions = JSON.parse(fileContent);

            if (!Array.isArray(questions)) {
                throw new Error("Geçersiz JSON formatı! Sorular bir dizi olmalıdır.");
            }

            const konuRef = doc(db, "konular", konuId);
            const konuDoc = await getDoc(konuRef);
            
            if (!konuDoc.exists()) {
                throw new Error("Konu bulunamadı!");
            }

            const konuData = konuDoc.data();
            const altKonular = konuData.altkonular || {};
            const subbranches = altKonular[altKonuId]?.subbranches || {};
            const existingQuestions = subbranches[selectedAltDal]?.questions || {};

            // Yeni soruları ekle
            const updatedQuestions = {
                ...existingQuestions
            };

            questions.forEach((question, index) => {
                const questionId = `q${Date.now()}_${index}`;
                updatedQuestions[questionId] = {
                    ...question,
                    soruNumarasi: Object.keys(existingQuestions).length + index + 1
                };
            });

            // Firestore'u güncelle
            const updatedSubbranches = {
                ...subbranches,
                [selectedAltDal]: {
                    ...subbranches[selectedAltDal],
                    questions: updatedQuestions
                }
            };

            const updatedAltKonular = {
                ...altKonular,
                [altKonuId]: {
                    ...altKonular[altKonuId],
                    subbranches: updatedSubbranches
                }
            };

            await updateDoc(konuRef, {
                altkonular: updatedAltKonular
            });

            toast.success("Sorular başarıyla import edildi!");
            onClose(true);
        } catch (error) {
            console.error("Hata:", error);
            toast.error(error.message || "Sorular import edilirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                    JSON'dan Soru Import Et
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            JSON Dosyası
                        </label>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => onClose(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !file}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Import Ediliyor..." : "Import Et"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ImportQuestionsFromJSON; 