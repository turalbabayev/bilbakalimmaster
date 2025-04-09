import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, update, get, child } from "firebase/database";

const ChangeQuestionOrder = ({ isOpen, onClose, soruRefPath, konuId, altKonuId, altDalId }) => {
    const [allQuestions, setAllQuestions] = useState([]);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
    const [targetQuestionNumber, setTargetQuestionNumber] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentSoruKey, setCurrentSoruKey] = useState("");
    const [basePath, setBasePath] = useState("");
    const [error, setError] = useState(null);
    const [testData, setTestData] = useState(null);
    
    useEffect(() => {
        if (!isOpen) return;
        
        console.log("Modal açıldı, referans:", soruRefPath);
        
        // Yapay gecikme - gerçek uygulama ile benzer deneyim için
        const timer = setTimeout(() => {
            setTestData({
                currentNumber: 3,
                questions: [
                    { id: "q1", soruNumarasi: 1, soruMetni: "Test soru 1" },
                    { id: "q2", soruNumarasi: 2, soruMetni: "Test soru 2" },
                    { id: "q3", soruNumarasi: 3, soruMetni: "Test soru 3 (seçili)" },
                    { id: "q4", soruNumarasi: 4, soruMetni: "Test soru 4" },
                    { id: "q5", soruNumarasi: 5, soruMetni: "Test soru 5" }
                ]
            });
            setIsLoading(false);
        }, 1000);
        
        return () => {
            clearTimeout(timer);
            setIsLoading(true);
            setTestData(null);
        };
    }, [isOpen, soruRefPath]);
    
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
    
    const handleSwapQuestions = () => {
        alert("Test modu: Sıralama değiştirildi gibi davranıyoruz");
        onClose();
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 pb-2 border-b">Soru Sıralaması Değiştir (TEST)</h2>
                
                {isLoading ? (
                    <div className="py-10 flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Yükleniyor...</p>
                    </div>
                ) : testData ? (
                    <div>
                        <div className="mb-4">
                            <p className="font-medium">Mevcut Soru: #{testData.currentNumber}</p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block mb-2">Takas Edilecek Soru:</label>
                            <select className="w-full p-2 border rounded">
                                {testData.questions.map(q => 
                                    <option key={q.id} value={q.soruNumarasi}>#{q.soruNumarasi} - {q.soruMetni}</option>
                                )}
                            </select>
                        </div>
                        
                        <div className="bg-gray-100 p-3 rounded mb-4">
                            <h3 className="font-medium mb-2">Tüm Sorular:</h3>
                            <ul className="space-y-1">
                                {testData.questions.map(q => (
                                    <li key={q.id} className={`p-2 rounded ${q.soruNumarasi === testData.currentNumber ? 'bg-blue-100' : ''}`}>
                                        <span className="font-medium">#{q.soruNumarasi}</span> - {q.soruMetni}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="py-10 text-center text-red-500">
                        <p>Veri yüklenemedi!</p>
                    </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-3 border-t mt-4">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => {
                            alert("Test: Soru sıralaması değiştirildi");
                            onClose();
                        }}
                        disabled={isLoading || !testData}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Sıralamayı Değiştir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeQuestionOrder; 