import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, update, get, child } from "firebase/database";

const ChangeQuestionOrder = ({ isOpen, onClose, soruRefPath, konuId, altKonuId, altDalId }) => {
    const [allQuestions, setAllQuestions] = useState([]);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
    const [targetQuestionNumber, setTargetQuestionNumber] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentSoruKey, setCurrentSoruKey] = useState("");
    const [basePath, setBasePath] = useState("");
    const [error, setError] = useState(null);
    
    useEffect(() => {
        if (!isOpen) return;
        
        setIsLoading(true);
        
        // Soru yolu üzerinden doğrudan ve tek yönlü sorguyla soruları alalım
        if (soruRefPath) {
            // Direkt kısa sorguları kullan, büyük veri almaktan kaçın
            (async () => {
                try {
                    // 1. Önce mevcut soruyu al
                    const dbRef = ref(database);
                    const currentSoruSnapshot = await get(child(dbRef, soruRefPath));
                    
                    if (!currentSoruSnapshot.exists()) {
                        throw new Error("Soru bulunamadı");
                    }
                    
                    const currentSoru = currentSoruSnapshot.val();
                    
                    // Mevcut sorumuzdan path bilgilerini çıkaralım
                    const parts = soruRefPath.split('/');
                    const soruKey = parts.pop();
                    const sorularPath = parts.join('/');
                    
                    console.log("SoruRefPath:", soruRefPath);
                    console.log("SoruKey:", soruKey);
                    console.log("SorularPath:", sorularPath);
                    
                    // 2. Aynı yolda bulunan diğer soruları al
                    const allSorusSnapshot = await get(child(dbRef, sorularPath));
                    
                    if (!allSorusSnapshot.exists()) {
                        console.error("Sorular bulunamadı. Path:", sorularPath);
                        console.error("Snapshot:", allSorusSnapshot);
                        throw new Error(`Sorular listesi bulunamadı. Path: ${sorularPath}`);
                    }
                    
                    const allSorusData = allSorusSnapshot.val();
                    console.log("AllSorusData:", Object.keys(allSorusData).length);
                    
                    // Dizi şeklinde dönüştür
                    const sorusArray = Object.entries(allSorusData).map(([key, soru]) => ({
                        id: key,
                        ...soru
                    })).sort((a, b) => (a.soruNumarasi || 999) - (b.soruNumarasi || 999));
                    
                    // State'leri güncelle
                    setAllQuestions(sorusArray);
                    setCurrentSoruKey(soruKey);
                    setBasePath(sorularPath);
                    setCurrentQuestionNumber(currentSoru.soruNumarasi || 0);
                    setTargetQuestionNumber(currentSoru.soruNumarasi || 0);
                    setError(null);
                    
                    console.log("Sorular başarıyla yüklendi", sorusArray.length);
                    
                } catch (error) {
                    console.error("Sorular yüklenirken hata:", error);
                    setError(error.message || "Bilinmeyen bir hata oluştu");
                } finally {
                    setIsLoading(false);
                }
            })();
        }
        
    }, [isOpen, soruRefPath, onClose]);
    
    const handleSwapQuestions = async () => {
        if (targetQuestionNumber <= 0) {
            alert("Lütfen geçerli bir soru numarası seçin");
            return;
        }
        
        if (targetQuestionNumber === currentQuestionNumber) {
            alert("Lütfen farklı bir soru numarası seçin");
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Hedef soru numarasına sahip olan soruyu bul
            const targetQuestion = allQuestions.find(q => q.soruNumarasi === targetQuestionNumber);
            
            if (!targetQuestion) {
                throw new Error(`${targetQuestionNumber} numaralı soru bulunamadı`);
            }
            
            // Sadece iki sorunun sıra numaralarını değiştir (takas/swap)
            const updates = {};
            
            // Mevcut sorunun numarasını hedef numaraya güncelle
            updates[`${basePath}/${currentSoruKey}/soruNumarasi`] = targetQuestionNumber;
            
            // Hedef sorunun numarasını mevcut numaraya güncelle
            updates[`${basePath}/${targetQuestion.id}/soruNumarasi`] = currentQuestionNumber;
            
            // Tüm güncellemeleri tek seferde yap
            await update(ref(database), updates);
            
            alert("Soru sıraları başarıyla takas edildi.");
            onClose();
        } catch (error) {
            console.error("Soru sırası değiştirme hatası:", error);
            alert(`Hata: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-3 border-gray-200 dark:border-gray-700">
                    Soru Sırasını Değiştir
                </h2>
                
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40">
                        <div className="text-red-500 text-xl mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p className="text-red-600 dark:text-red-400 text-center font-medium">
                            {error}
                        </p>
                        <div className="mt-4">
                            <button 
                                onClick={() => window.location.reload()} 
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                                Sayfayı Yenile
                            </button>
                        </div>
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
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        {allQuestions.length > 0 && (
                            <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
                                <h3 className="font-medium text-indigo-800 dark:text-indigo-300 mb-2">Mevcut Soru Sıralaması:</h3>
                                <div className="max-h-40 overflow-y-auto pr-2">
                                    <ul className="space-y-1.5">
                                        {allQuestions.map((question) => (
                                            <li 
                                                key={question.id} 
                                                className={`text-sm py-1 px-2 rounded ${
                                                    question.id === currentSoruKey
                                                    ? 'bg-indigo-100 dark:bg-indigo-800/50 font-medium' 
                                                    : question.soruNumarasi === targetQuestionNumber
                                                    ? 'bg-amber-100 dark:bg-amber-800/30 font-medium'
                                                    : ''
                                                }`}
                                            >
                                                <span className="font-medium mr-2">#{question.soruNumarasi || '?'}</span>
                                                {(question.soruMetni || "").substring(0, 60)}
                                                {question.soruMetni?.length > 60 ? '...' : ''}
                                                {question.id === currentSoruKey ? 
                                                    <span className="ml-1 text-indigo-600 dark:text-indigo-400">(seçili)</span>
                                                    : question.soruNumarasi === targetQuestionNumber ?
                                                    <span className="ml-1 text-amber-600 dark:text-amber-400">(takas edilecek)</span>
                                                    : null
                                                }
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        İptal
                    </button>
                    <button
                        className={`bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all font-medium ${
                            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        onClick={handleSwapQuestions}
                        disabled={isSubmitting || isLoading || allQuestions.length === 0}
                    >
                        {isSubmitting ? "İşleniyor..." : "Soruları Takas Et"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeQuestionOrder; 