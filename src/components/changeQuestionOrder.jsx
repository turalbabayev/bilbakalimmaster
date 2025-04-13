import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";

const ChangeQuestionOrder = ({ isOpen, onClose, soruRefPath, konuId, altKonuId }) => {
    const [allQuestions, setAllQuestions] = useState([]);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
    const [targetQuestionNumber, setTargetQuestionNumber] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentSoruKey, setCurrentSoruKey] = useState("");

    useEffect(() => {
        if (!isOpen || !soruRefPath) return;

        const loadCurrentQuestion = async () => {
            try {
                setIsLoading(true);
                
                // Mevcut sorunun ID'sini al
                const soruId = soruRefPath.split('/').pop();
                setCurrentSoruKey(soruId);

                // Firestore koleksiyon referansı
                const sorularCollectionRef = collection(db, "konular", konuId, "altkonular", altKonuId, "sorular");
                
                // Tüm soruları getir
                const querySnapshot = await getDocs(sorularCollectionRef);
                const questions = [];
                querySnapshot.forEach((doc) => {
                    questions.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                // Soruları sıra numarasına göre sırala
                const sortedQuestions = questions.sort((a, b) => (a.soruNumarasi || 0) - (b.soruNumarasi || 0));
                setAllQuestions(sortedQuestions);

                // Mevcut sorunun sıra numarasını bul
                const currentQuestion = sortedQuestions.find(q => q.id === soruId);
                if (currentQuestion) {
                    setCurrentQuestionNumber(currentQuestion.soruNumarasi || 0);
                    setTargetQuestionNumber(currentQuestion.soruNumarasi || 0);
                }

            } catch (error) {
                console.error("Sorular yüklenirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCurrentQuestion();
    }, [isOpen, soruRefPath, konuId, altKonuId]);

    const handleSwapQuestions = async () => {
        // Hedef numara geçerli değilse işlemi iptal et
        if (targetQuestionNumber <= 0 || targetQuestionNumber > allQuestions.length) {
            alert(`Lütfen 1 ile ${allQuestions.length} arasında bir numara girin.`);
            return;
        }

        // Aynı numara seçildiyse işlemi iptal et
        if (targetQuestionNumber === currentQuestionNumber) {
            alert("Aynı numara seçildi, değişiklik yapılmadı.");
            onClose();
            return;
        }

        setIsSubmitting(true);

        try {
            // Hedef soru numarasına sahip olan soruyu bul
            const targetQuestion = allQuestions.find(q => q.soruNumarasi === targetQuestionNumber);
            const currentQuestion = allQuestions.find(q => q.id === currentSoruKey);

            if (!targetQuestion || !currentQuestion) {
                alert("Soru bulunamadı!");
                setIsSubmitting(false);
                return;
            }

            // Her iki sorunun referanslarını al
            const currentSoruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", currentQuestion.id);
            const targetSoruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", targetQuestion.id);

            // Sıra numaralarını değiştir
            await Promise.all([
                updateDoc(currentSoruRef, { soruNumarasi: targetQuestionNumber }),
                updateDoc(targetSoruRef, { soruNumarasi: currentQuestionNumber })
            ]);

            alert("Soru sıraları başarıyla takas edildi.");
            onClose();
        } catch (error) {
            console.error("Sıra değiştirme sırasında hata:", error);
            alert("Sıra değiştirme işlemi sırasında bir hata oluştu!");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Soru Sırasını Değiştir
                    </h2>
                </div>

                <div className="p-8">
                    {isLoading ? (
                        <div className="flex justify-center">
                            <div className="w-8 h-8 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                    Mevcut Soru Numarası:
                                </label>
                                <input
                                    type="number"
                                    value={currentQuestionNumber}
                                    disabled
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                    Takas Edilecek Soru Numarası:
                                </label>
                                <input
                                    type="number"
                                    value={targetQuestionNumber}
                                    onChange={(e) => setTargetQuestionNumber(Number(e.target.value))}
                                    min="1"
                                    max={allQuestions.length}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Bu kategori için olası soru numaraları: 1 - {allQuestions.length}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSwapQuestions}
                        disabled={isSubmitting || isLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                İşlem Yapılıyor...
                            </>
                        ) : (
                            "Değiştir"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeQuestionOrder; 